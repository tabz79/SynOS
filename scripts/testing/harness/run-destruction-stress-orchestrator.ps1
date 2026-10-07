# ==============================================================================
# SynOS Post-Installation Full-System Destruction & Stress Testing Orchestrator
# Attacks the complete chain: Browser/UI -> API -> SQL Server -> Windows Service -> Files/PACS -> Integrations
# ==============================================================================

param(
    [string]$InstallerPath = "SynOS_Setup_v239_testing.exe",
    [string]$BaseUrl = "http://localhost:59999",
    [string]$ResultsDir = "test-results\destruction-harness"
)

$ErrorActionPreference = "Continue"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " SYNOS POST-INSTALLATION FULL-SYSTEM DESTRUCTION & STRESS TEST CAMPAIGN" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

if (-not (Test-Path $ResultsDir)) {
    New-Item -ItemType Directory -Path $ResultsDir -Force | Out-Null
}

$LogFile = Join-Path $ResultsDir "orchestrator-execution.log"

function Log-Master([string]$msg, [string]$lvl = "INFO") {
    $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$ts] [$lvl] $msg"
    Write-Host $line -ForegroundColor $(switch ($lvl) { "ERROR" { "Red" }; "SUCCESS" { "Green" }; "HOSTILE" { "Magenta" }; default { "White" } })
    Add-Content -Path $LogFile -Value $line -Force
}

# ------------------------------------------------------------------------------
# STEP 1: Verify Installation or Install SynOS
# ------------------------------------------------------------------------------
Log-Master "STEP 1: Verifying SynOS Windows Installation..." "INFO"

$apiExe = "C:\Program Files\TBZ Labs\SynOS\SynOS.Api.exe"
if (-not (Test-Path $apiExe)) {
    if (-not (Test-Path $InstallerPath)) {
        Log-Master "Installer binary not found at $InstallerPath! Attempting to locate in current directory..." "ERROR"
        $found = Get-ChildItem -Filter "SynOS_Setup*.exe" | Select-Object -First 1
        if ($found) { $InstallerPath = $found.FullName }
    }

    if (Test-Path $InstallerPath) {
        Log-Master "Executing silent installation: $InstallerPath..." "INFO"
        $installLog = Join-Path (Resolve-Path $ResultsDir).Path "inno_install.log"
        $installProcess = Start-Process -FilePath $InstallerPath -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /LOG=`"$installLog`"" -Wait -PassThru
        Log-Master "Installer process exited with code $($installProcess.ExitCode)." "SUCCESS"
        Start-Sleep -Seconds 10
    } else {
        Log-Master "FATAL: Cannot proceed without installed SynOS or installer binary." "ERROR"
        exit 1
    }
}

# Ensure service is started
$svc = Get-Service -Name "TBZSynOSService" -ErrorAction SilentlyContinue
if ($svc) {
    Log-Master "TBZSynOSService status: $($svc.Status)" "INFO"
    if ($svc.Status -ne "Running") {
        Log-Master "Starting Windows Service (TBZSynOSService)..." "INFO"
        Start-Service -Name "TBZSynOSService" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
} else {
    Log-Master "WARNING: TBZSynOSService not registered as Windows Service. Checking SynOS.Api.exe..." "ERROR"
}

# Wait for HTTP endpoint on port 59999
Log-Master "Waiting for port 59999 to become ready..." "INFO"
$isReady = $false
$sw = [System.Diagnostics.Stopwatch]::StartNew()
while ($sw.Elapsed.TotalSeconds -lt 90) {
    try {
        $res = Invoke-RestMethod -Uri "$BaseUrl/api/v1/setup/status" -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($res) { $isReady = $true; break }
    } catch {}
    try {
        $res = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method Post -Body (@{username="test";password="test"} | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($res -or $res -eq $null) { $isReady = $true; break }
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 401) { $isReady = $true; break }
    }

    # If service crashed or stopped, restart it
    $svcCheck = Get-Service -Name "TBZSynOSService" -ErrorAction SilentlyContinue
    if ($svcCheck -and $svcCheck.Status -ne "Running") {
        Log-Master "Service stopped during boot; restarting TBZSynOSService..." "HOSTILE"
        Start-Service -Name "TBZSynOSService" -ErrorAction SilentlyContinue
    }

    Start-Sleep -Seconds 2
}

if (-not $isReady) {
    Log-Master "WARNING: SynOS port 59999 not responding within 90s. Checking running processes..." "ERROR"
    Get-Process -Name "*SynOS*" -ErrorAction SilentlyContinue | ForEach-Object { Log-Master "Process: $($_.Name) PID=$($_.Id) WS=$([math]::Round($_.WorkingSet64/1MB, 2))MB" "INFO" }
    
    # Fallback: start directly if service fails
    $apiProc = Get-Process -Name "SynOS.Api" -ErrorAction SilentlyContinue
    if (-not $apiProc -and (Test-Path $apiExe)) {
        Log-Master "Attempting direct background launch of $apiExe..." "HOSTILE"
        Start-Process -FilePath $apiExe -WorkingDirectory (Split-Path $apiExe) -WindowStyle Hidden
        Start-Sleep -Seconds 10
    }
}

# ------------------------------------------------------------------------------
# STEP 2: First-Time Setup Initialization (If in Setup Mode)
# ------------------------------------------------------------------------------
Log-Master "STEP 2: Checking Setup Mode vs Operational Mode..." "INFO"

$setupState = $null
try {
    $setupState = Invoke-RestMethod -Uri "$BaseUrl/api/v1/setup/status" -TimeoutSec 5 -ErrorAction SilentlyContinue
} catch {}

if ($setupState -and $setupState.isConfigured -eq $false) {
    Log-Master "SynOS is in bootstrap setup mode. Initializing operational database & seed catalogs..." "HOSTILE"
    $initPayload = @{
        databaseServer = ".\SYNOS"
        databaseName = "SynOSDb-1"
        databaseUser = ""
        databasePassword = ""
        adminUsername = "admin"
        adminPassword = "admin123"
        documentStorageFolder = "C:\SynOS_Files"
        workingDirectory = "C:\SynOS_Working"
        pacsStorageFolder = "C:\SynOS_Files\PACS"
        middlewareApiUrl = "https://cloud.tbzlabs.in/api/events"
        middlewareApiKey = ""
        isReconnect = $false
    } | ConvertTo-Json

    try {
        $initRes = Invoke-RestMethod -Uri "$BaseUrl/api/v1/setup/initialize" -Method Post -Body $initPayload -ContentType "application/json" -TimeoutSec 90
        Log-Master "Setup initialization succeeded: $($initRes | ConvertTo-Json -Compress)" "SUCCESS"
        
        # Setup stops the bootstrap server and starts TBZSynOSService. Wait for port 59999 to respond again.
        Log-Master "Waiting for TBZSynOSService handover on port 59999..." "INFO"
        Start-Sleep -Seconds 5
        $handoverReady = $false
        $swHandover = [System.Diagnostics.Stopwatch]::StartNew()
        while ($swHandover.Elapsed.TotalSeconds -lt 60) {
            try {
                $statusRes = Invoke-RestMethod -Uri "$BaseUrl/api/v1/setup/status" -TimeoutSec 3 -ErrorAction SilentlyContinue
                if ($statusRes -and $statusRes.isConfigured -eq $true) {
                    $handoverReady = $true
                    Log-Master "TBZSynOSService successfully online in operational mode (handover completed in $([math]::Round($swHandover.Elapsed.TotalSeconds, 1))s)." "SUCCESS"
                    break
                }
            } catch {}
            
            # Ensure service is running
            $s = Get-Service -Name "TBZSynOSService" -ErrorAction SilentlyContinue
            if ($s -and $s.Status -ne "Running") {
                Start-Service -Name "TBZSynOSService" -ErrorAction SilentlyContinue
            }
            Start-Sleep -Seconds 2
        }
        if (-not $handoverReady) {
            Log-Master "WARNING: Handover wait exceeded 60s. Continuing to test suite..." "ERROR"
        }
    } catch {
        Log-Master "Setup initialization response/warning: $_" "INFO"
    }
} else {
    Log-Master "SynOS is already configured in operational mode." "SUCCESS"
}

# ------------------------------------------------------------------------------
# STEP 3: Setup Dependencies for Test Execution
# ------------------------------------------------------------------------------
Log-Master "STEP 3: Installing Python DICOM tools..." "INFO"
try {
    pip install pydicom pynetdicom requests --quiet
    Log-Master "Python DICOM libraries ready." "SUCCESS"
} catch {
    Log-Master "Warning installing python packages: $_" "INFO"
}

# ------------------------------------------------------------------------------
# STEP 4: Execute the 6 Pillars of Destruction & Stress
# ------------------------------------------------------------------------------
$SuiteDir = Join-Path $PSScriptRoot "..\suite"
$MasterReport = @{
    startTime = (Get-Date).ToString("o")
    installerUsed = $InstallerPath
    pillars = @()
    allPassed = $true
}

# Pillar 1
Log-Master "LAUNCHING PILLAR 1: Real-World Workflows..." "HOSTILE"
$p1Script = Join-Path $SuiteDir "01_realworld_e2e_chains.js"
$p1Out = & node $p1Script 2>&1
$p1Passed = ($LASTEXITCODE -eq 0)
Log-Master "Pillar 1 Result: $(if ($p1Passed) { 'PASS' } else { 'FAIL' })" $(if ($p1Passed) { "SUCCESS" } else { "ERROR" })
$MasterReport.pillars += @{ id = "Pillar-1"; name = "Real-World Workflows"; passed = $p1Passed; output = ($p1Out -join "`n") }
if (-not $p1Passed) { $MasterReport.allPassed = $false }

# Pillar 2
Log-Master "LAUNCHING PILLAR 2: UI Abuse, Button Spamming & Hostile Payloads..." "HOSTILE"
$p2Script = Join-Path $SuiteDir "02_ui_abuse_chaos.js"
$p2Out = & node $p2Script 2>&1
$p2Passed = ($LASTEXITCODE -eq 0)
Log-Master "Pillar 2 Result: $(if ($p2Passed) { 'PASS' } else { 'FAIL' })" $(if ($p2Passed) { "SUCCESS" } else { "ERROR" })
$MasterReport.pillars += @{ id = "Pillar-2"; name = "UI Abuse & Chaos"; passed = $p2Passed; output = ($p2Out -join "`n") }
if (-not $p2Passed) { $MasterReport.allPassed = $false }

# Pillar 3
Log-Master "LAUNCHING PILLAR 3: Progressive Concurrency Stress (10 -> 25 -> 50 -> 100)..." "HOSTILE"
$p3Script = Join-Path $SuiteDir "03_concurrency_scaling.js"
$p3Out = & node $p3Script 2>&1
$p3Passed = ($LASTEXITCODE -eq 0)
Log-Master "Pillar 3 Result: $(if ($p3Passed) { 'PASS' } else { 'FAIL' })" $(if ($p3Passed) { "SUCCESS" } else { "ERROR" })
$MasterReport.pillars += @{ id = "Pillar-3"; name = "Progressive Concurrency"; passed = $p3Passed; output = ($p3Out -join "`n") }
if (-not $p3Passed) { $MasterReport.allPassed = $false }

# Pillar 4
Log-Master "LAUNCHING PILLAR 4: Active Fault Injection & Process Destruction..." "HOSTILE"
$p4Script = Join-Path $SuiteDir "04_active_fault_injection.ps1"
$p4Out = & powershell.exe -ExecutionPolicy Bypass -File $p4Script 2>&1
$p4Passed = ($LASTEXITCODE -eq 0)
Log-Master "Pillar 4 Result: $(if ($p4Passed) { 'PASS' } else { 'FAIL' })" $(if ($p4Passed) { "SUCCESS" } else { "ERROR" })
$MasterReport.pillars += @{ id = "Pillar-4"; name = "Active Destruction"; passed = $p4Passed; output = ($p4Out -join "`n") }
if (-not $p4Passed) { $MasterReport.allPassed = $false }

# Pillar 5
Log-Master "LAUNCHING PILLAR 5: Hardware & Integration Layer Chaos..." "HOSTILE"
$p5Script = Join-Path $SuiteDir "05_hardware_integration_chaos.js"
$p5Out = & node $p5Script 2>&1
$p5Passed = ($LASTEXITCODE -eq 0)
Log-Master "Pillar 5 Result: $(if ($p5Passed) { 'PASS' } else { 'FAIL' })" $(if ($p5Passed) { "SUCCESS" } else { "ERROR" })
$MasterReport.pillars += @{ id = "Pillar-5"; name = "Hardware Chaos"; passed = $p5Passed; output = ($p5Out -join "`n") }
if (-not $p5Passed) { $MasterReport.allPassed = $false }

# Pillar 6
Log-Master "LAUNCHING PILLAR 6: Sustained Stress & Memory Leak Audit..." "HOSTILE"
$p6Script = Join-Path $SuiteDir "06_sustained_health_audit.ps1"
$p6Out = & powershell.exe -ExecutionPolicy Bypass -File $p6Script -DurationSeconds 60 2>&1
$p6Passed = ($LASTEXITCODE -eq 0)
Log-Master "Pillar 6 Result: $(if ($p6Passed) { 'PASS' } else { 'FAIL' })" $(if ($p6Passed) { "SUCCESS" } else { "ERROR" })
$MasterReport.pillars += @{ id = "Pillar-6"; name = "Sustained Health Audit"; passed = $p6Passed; output = ($p6Out -join "`n") }
if (-not $p6Passed) { $MasterReport.allPassed = $false }

# Pillar 7: UI Interaction Profiler & Abuse Stress
Log-Master "LAUNCHING PILLAR 7: UI Interaction Latency & Interaction Abuse Profiler..." "HOSTILE"
$p7Script = Join-Path $SuiteDir "07_ui_interaction_profiler.js"
$p7Out = & node $p7Script 2>&1
$p7Passed = ($LASTEXITCODE -eq 0)
Log-Master "Pillar 7 Result: $(if ($p7Passed) { 'PASS' } else { 'FAIL' })" $(if ($p7Passed) { "SUCCESS" } else { "ERROR" })
$MasterReport.pillars += @{ id = "Pillar-7"; name = "UI Interaction Profiler"; passed = $p7Passed; output = ($p7Out -join "`n") }
if (-not $p7Passed) { $MasterReport.allPassed = $false }

# ------------------------------------------------------------------------------
# STEP 5: Final Forensic Verdict Generation
# ------------------------------------------------------------------------------
$MasterReport.endTime = (Get-Date).ToString("o")
$MasterReport.finalVerdict = if ($MasterReport.allPassed) { "PASS" } else { "FAIL" }

$summaryJsonPath = Join-Path $ResultsDir "destruction-stress-summary.json"
$MasterReport | ConvertTo-Json -Depth 5 | Set-Content -Path $summaryJsonPath -Force

# Generate Markdown Summary
$reportMdPath = Join-Path $ResultsDir "destruction-stress-report.md"
$verdictBadge = if ($MasterReport.allPassed) { "PASS - Safe for pilot/client deployment" } else { "FAIL - Do not deploy" }

$p1Status = if ($p1Passed) { "PASSED" } else { "FAILED" }
$p2Status = if ($p2Passed) { "PASSED" } else { "FAILED" }
$p3Status = if ($p3Passed) { "PASSED" } else { "FAILED" }
$p4Status = if ($p4Passed) { "PASSED" } else { "FAILED" }
$p5Status = if ($p5Passed) { "PASSED" } else { "FAILED" }
$p6Status = if ($p6Passed) { "PASSED" } else { "FAILED" }
$p7Status = if ($p7Passed) { "PASSED" } else { "FAILED" }

$mdLines = @(
    "# SynOS Post-Installation Destruction & Stress Test Report",
    "",
    "**Execution Timestamp:** $($MasterReport.startTime)",
    "**Final Forensic Verdict:** **$verdictBadge**",
    "",
    "---",
    "",
    "### Pillar Execution Matrix",
    "",
    "| Pillar | Focus Area | Status | Key Forensic Observations |",
    "| :--- | :--- | :---: | :--- |",
    "| **Pillar 1** | Real-World Multi-Role Workflows | $p1Status | Patient intake, Phlebotomy, Results, Digital Signature, Report PDF, Delivery, DICOM |",
    "| **Pillar 2** | UI Abuse & Hostile Injections | $p2Status | Double-click registration dedup, payment race idempotency, 10KB fuzzing, SQLi hardening |",
    "| **Pillar 3** | Progressive Concurrency Scaling | $p3Status | 10 -> 25 -> 50 -> 100 simultaneous workflows; SQL lock waits & cross-patient data leaks |",
    "| **Pillar 4** | Active Destruction & Hard Crashes | $p4Status | Killed SynOS process & stopped SQL Server during active transactions; consistency audit |",
    "| **Pillar 5** | Hardware & Integration Layer Chaos | $p5Status | ASTM E1381 TCP injection & DICOM C-STORE flood during simultaneous patient load |",
    "| **Pillar 6** | Sustained Stress & Memory Leak Audit | $p6Status | Memory deltas, private bytes, handle count leaks, and zero-byte file orphan scan |",
    "| **Pillar 7** | UI Interaction & Abuse Profiling | $p7Status | Granular click-to-render latency breakdown, debounce thrashing, and button abuse |",
    "",
    "---",
    "",
    "### Overall Verdict Details",
    "$verdictBadge"
)

$mdLines -join "`n" | Set-Content -Path $reportMdPath -Force

Log-Master "================================================================================" "INFO"
Log-Master "FINAL VERDICT: $verdictBadge" $(if ($MasterReport.allPassed) { "SUCCESS" } else { "ERROR" })
Log-Master "Results written to: $summaryJsonPath and $reportMdPath" "SUCCESS"
Log-Master "================================================================================" "INFO"

if (-not $MasterReport.allPassed) {
    exit 1
} else {
    exit 0
}
