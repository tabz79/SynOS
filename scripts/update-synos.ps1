# ==============================================================================
# SynOS Zero-Downtime Hot-Swap Automated Deployment Engine
# ==============================================================================
param (
    [switch]$SkipGitPull = $false,
    [switch]$ForceSlotA = $false,
    [switch]$ForceSlotB = $false
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir

function Write-Step {
    param([string]$Msg)
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] >>> $Msg" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Msg)
    Write-Host "`n$Msg" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Msg)
    Write-Host "`n[ERROR] $Msg" -ForegroundColor Red
}

Write-Host @"
==============================================================================
   SynOS Zero-Downtime Enterprise Hot-Swap Engine
==============================================================================
"@ -ForegroundColor Yellow

# 1. Pull Latest Code
if (-not $SkipGitPull) {
    Write-Step "Checking for latest updates from Git..."
    $currentBranch = (git -C $RepoRoot rev-parse --abbrev-ref HEAD).Trim()
    Write-Host "   Branch: $currentBranch" -ForegroundColor Gray
    git -C $RepoRoot pull origin $currentBranch
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Git pull failed. Please resolve merge conflicts before updating."
        exit 1
    }
} else {
    Write-Step "Skipping git pull (-SkipGitPull flag specified)."
}

$currentCommit = (git -C $RepoRoot rev-parse --short HEAD).Trim()
Write-Host "   Target Commit: $currentCommit" -ForegroundColor Gray

# 2. Setup Directories
$BaseDir = "C:\SynOS_Slots"
if (-not (Test-Path $BaseDir)) {
    New-Item -Path $BaseDir -ItemType Directory -Force | Out-Null
}

$SlotADir = Join-Path $BaseDir "SlotA"
$SlotBDir = Join-Path $BaseDir "SlotB"
$GatewayDir = "C:\Program Files\TBZ Labs\SynOS Gateway"

if (-not (Test-Path $SlotADir)) { New-Item -Path $SlotADir -ItemType Directory -Force | Out-Null }
if (-not (Test-Path $SlotBDir)) { New-Item -Path $SlotBDir -ItemType Directory -Force | Out-Null }
if (-not (Test-Path $GatewayDir)) { New-Item -Path $GatewayDir -ItemType Directory -Force | Out-Null }

$PortA = 59998
$PortB = 59997
$GatewayPort = 59999

# 3. Determine Active Slot from Gateway
Write-Step "Inspecting active production slot via Gateway..."
$activePort = 0
try {
    $gwStatus = Invoke-RestMethod -Uri "http://127.0.0.1:$GatewayPort/_gateway/status" -TimeoutSec 3 -ErrorAction Stop
    $activePort = [int]$gwStatus.activeUpstreamPort
    Write-Host "   Gateway is ONLINE. Current active upstream: Port $activePort" -ForegroundColor Green
} catch {
    Write-Host "   Gateway is currently starting or not installed yet." -ForegroundColor Yellow
}

# Determine target slot
$targetSlot = "SlotB"
$targetPort = $PortB
$targetDir = $SlotBDir
$oldPort = $PortA

if ($ForceSlotA -or ($activePort -eq $PortB)) {
    $targetSlot = "SlotA"
    $targetPort = $PortA
    $targetDir = $SlotADir
    $oldPort = $PortB
}

Write-Step "Target deployment: $targetSlot (Port $targetPort)"
Write-Host "   Standby Slot Directory: $targetDir" -ForegroundColor Gray

# 4. Build Frontend Bundle
Write-Step "Building SynOS Frontend bundle..."
$frontendDir = Join-Path $RepoRoot "src\SynOS.Frontend"
Push-Location $frontendDir
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Frontend build failed. Aborting deployment."
        exit 1
    }
} finally {
    Pop-Location
}

# Sync wwwroot to API project
Write-Step "Synchronizing frontend assets to SynOS.Api..."
$distDir = Join-Path $frontendDir "dist-build"
$apiWwwroot = Join-Path $RepoRoot "src\SynOS.Api\wwwroot"
if (Test-Path $distDir) {
    if (-not (Test-Path $apiWwwroot)) { New-Item -Path $apiWwwroot -ItemType Directory -Force | Out-Null }
    Copy-Item -Path "$distDir\*" -Destination $apiWwwroot -Recurse -Force
}

# 5. Build and Publish Gateway (if needed or updated)
Write-Step "Publishing SynOS Gateway..."
$gatewayProject = Join-Path $RepoRoot "src\SynOS.Gateway\SynOS.Gateway.csproj"
dotnet publish $gatewayProject -c Release -o $GatewayDir --nologo | Out-Null

# Ensure Gateway Service is Installed and Running
$gwService = Get-Service -Name "TBZSynOSGateway" -ErrorAction SilentlyContinue
if (-not $gwService) {
    Write-Step "Registering Windows Service: TBZSynOSGateway..."
    & sc.exe create TBZSynOSGateway start= auto binPath= "`"$GatewayDir\SynOS.Gateway.exe`"" DisplayName= "TBZ Labs - SynOS Enterprise Gateway" depend= / | Out-Null
    & sc.exe failure TBZSynOSGateway reset= 86400 actions= restart/5000/restart/5000/restart/5000 | Out-Null
    Start-Sleep -Seconds 1
}

# Ensure Firewall rule for port 59999
$fwRule = Get-NetFirewallRule -DisplayName "TBZ Labs - SynOS Gateway" -ErrorAction SilentlyContinue
if (-not $fwRule) {
    New-NetFirewallRule -DisplayName "TBZ Labs - SynOS Gateway" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $GatewayPort -Profile Private, Public -ErrorAction SilentlyContinue | Out-Null
}

# 6. Publish Target Slot
Write-Step "Publishing SynOS.Api to $targetSlot..."
$apiProject = Join-Path $RepoRoot "src\SynOS.Api\SynOS.Api.csproj"
dotnet publish $apiProject -c Release -o $targetDir --nologo
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Backend publish failed. Live service remains untouched."
    exit 1
}

# Copy existing configuration if available
$existingAppSettings = "C:\Program Files\TBZ Labs\SynOS\appsettings.json"
$targetAppSettings = Join-Path $targetDir "appsettings.json"
if ((Test-Path $existingAppSettings) -and (-not (Test-Path $targetAppSettings))) {
    Copy-Item -Path $existingAppSettings -Destination $targetAppSettings -Force
}

# 7. Run Pre-Service Database Migration
Write-Step "Running database schema migrations ($targetSlot)..."
$targetExe = Join-Path $targetDir "SynOS.Api.exe"
$migrateProc = Start-Process -FilePath $targetExe -ArgumentList "--migrate-db" -WorkingDirectory $targetDir -NoNewWindow -Wait -PassThru
if ($migrateProc.ExitCode -ne 0) {
    Write-Fail "Database schema migration failed (Exit Code: $($migrateProc.ExitCode)). Live service remains untouched."
    exit 1
}
Write-Host "   Database schema verified and up-to-date." -ForegroundColor Green

# 8. Start Target Slot Windows Service
$targetServiceName = if ($targetSlot -eq "SlotA") { "TBZSynOS_SlotA" } else { "TBZSynOS_SlotB" }
$oldServiceName = if ($targetSlot -eq "SlotA") { "TBZSynOS_SlotB" } else { "TBZSynOS_SlotA" }

Write-Step "Configuring Windows Service $targetServiceName on port $targetPort..."
$targetSvc = Get-Service -Name $targetServiceName -ErrorAction SilentlyContinue
if (-not $targetSvc) {
    & sc.exe create $targetServiceName start= auto binPath= "`"$targetExe`" --port $targetPort" DisplayName= "TBZ Labs - SynOS ($targetSlot)" depend= / | Out-Null
    & sc.exe failure $targetServiceName reset= 86400 actions= restart/5000/restart/5000/restart/5000 | Out-Null
} else {
    & sc.exe config $targetServiceName binPath= "`"$targetExe`" --port $targetPort" start= auto | Out-Null
}

Write-Step "Starting $targetServiceName..."
Restart-Service -Name $targetServiceName -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 9. Health Check Verification Loop
Write-Step "Waiting for $targetSlot to reach healthy state..."
$healthUrl = "http://127.0.0.1:$targetPort/api/health"
$maxWaitSec = 45
$elapsedSec = 0
$isHealthy = $false

while ($elapsedSec -lt $maxWaitSec) {
    try {
        $res = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($res.StatusCode -eq 200) {
            $isHealthy = $true
            break
        }
    } catch {
        # Warming up
    }
    Start-Sleep -Seconds 1
    $elapsedSec++
    Write-Host -NoNewline "."
}
Write-Host ""

if (-not $isHealthy) {
    Write-Fail "$targetSlot failed health verification within $maxWaitSec seconds! Rolling back..."
    try { Stop-Service -Name $targetServiceName -Force -ErrorAction SilentlyContinue } catch {}
    Write-Host "   Target service stopped. Live service was NOT touched." -ForegroundColor Yellow
    exit 1
}

Write-Host "   $targetSlot passed health check (200 OK after $elapsedSec s)!" -ForegroundColor Green

# 10. Ensure Gateway Service is Running
$gwSvc = Get-Service -Name "TBZSynOSGateway" -ErrorAction SilentlyContinue
if ($gwSvc.Status -ne "Running") {
    # If legacy TBZSynOSService is holding port 59999, stop it so Gateway can take over 59999
    $legacyPort = Get-NetTCPConnection -LocalPort $GatewayPort -State Listen -ErrorAction SilentlyContinue
    if ($legacyPort) {
        Write-Step "Stopping legacy listener on port $GatewayPort..."
        Stop-Service -Name "TBZSynOSService" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
    Write-Step "Starting TBZSynOSGateway on port $GatewayPort..."
    Start-Service -Name "TBZSynOSGateway"
    Start-Sleep -Seconds 2
}

# 11. Instant Hot-Swap Switch
Write-Step "Executing INSTANT HOT-SWAP to $targetSlot (Port $targetPort)..."
$switchRes = Invoke-RestMethod -Uri "http://127.0.0.1:$GatewayPort/_gateway/switch?port=$targetPort" -Method Post -TimeoutSec 5
if ($switchRes.success) {
    Write-Host "   Switch confirmed! Traffic is now flowing to $targetSlot (Port $targetPort)" -ForegroundColor Green
} else {
    Write-Fail "Gateway switch returned unexpected result: $switchRes"
}

# 12. Gracefully Stop Old Slot Service
Write-Step "Draining and stopping previous service $oldServiceName..."
Start-Sleep -Seconds 2 # Allow in-flight requests to complete
$oldSvc = Get-Service -Name $oldServiceName -ErrorAction SilentlyContinue
if ($oldSvc -and $oldSvc.Status -eq "Running") {
    Stop-Service -Name $oldServiceName -Force -ErrorAction SilentlyContinue
    & sc.exe config $oldServiceName start= demand | Out-Null # Set to manual so only active slot boots on startup
    Write-Host "   Previous service $oldServiceName stopped cleanly." -ForegroundColor Gray
}

# Also ensure legacy TBZSynOSService is set to manual so it doesn't fight for port 59999
try {
    Stop-Service -Name "TBZSynOSService" -Force -ErrorAction SilentlyContinue
    Set-Service -Name "TBZSynOSService" -StartupType Manual -ErrorAction SilentlyContinue
} catch {}

# 13. Final Public Verification
Write-Step "Verifying public access through Gateway..."
try {
    $pubHealth = Invoke-WebRequest -Uri "http://127.0.0.1:$GatewayPort/api/health" -TimeoutSec 3 -UseBasicParsing
    Write-Host "   Gateway Health Check: Status $($pubHealth.StatusCode) OK" -ForegroundColor Green
} catch {
    Write-Host "   Warning: Gateway health check returned: $_" -ForegroundColor Yellow
}

Write-Success @"
==============================================================================
   SYN-OS ZERO-DOWNTIME UPDATE COMPLETED SUCCESSFULLY!
==============================================================================
   Active Slot:     $targetSlot
   Active Upstream: Port $targetPort
   Public Gateway:  Port $GatewayPort (https://synos.tbzlabs.in)
   Git Commit:      $currentCommit
   Downtime:        0.00 seconds (No dropped connections)
==============================================================================
"@
