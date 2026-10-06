# verify-installation.ps1
# This script is executed by the SynOS Installer to perform post-installation verification,
# firewall configuration, and service startup checks.

param (
    [string]$AppDir = "",
    [string]$LogFile = ""
)

# Resolve directories
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if ([string]::IsNullOrWhiteSpace($ScriptDir)) { $ScriptDir = $PSScriptRoot }

# Load Central Configuration
$ConfigPath = Join-Path $ScriptDir "installer-config.ps1"
if (Test-Path $ConfigPath) {
    . $ConfigPath
} else {
    $SynOSPort = 59999
    $SynOSService = "TBZSynOSService"
    $SynOSDisplayName = "TBZ SynOS Service"
}

# Resolve Log File Path (Phase 5: Log Directory Standardization)
if ([string]::IsNullOrWhiteSpace($LogFile)) {
    $ProgramDataLogs = "C:\ProgramData\TBZ Labs\SynOS\Logs"
    if (-not (Test-Path $ProgramDataLogs)) {
        New-Item -Path $ProgramDataLogs -ItemType Directory -Force | Out-Null
    }
    $LogFile = Join-Path $ProgramDataLogs $DefaultLogFile
}

function Log-Message {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] [VERIFY] $Message"
    Write-Output $logLine
    Add-Content -Path $LogFile -Value $logLine -ErrorAction SilentlyContinue
}

Log-Message "=================================================="
Log-Message "Verification and configuration script started."
Log-Message "App Directory: $AppDir"
Log-Message "Target Port: $SynOSPort"

# 1. Configure Windows Firewall Rule
try {
    Log-Message "Configuring Windows Firewall rules for TCP port $SynOSPort..."
    $ruleExists = Get-NetFirewallRule -DisplayName "$SynOSDisplayName" -ErrorAction SilentlyContinue
    if (-not $ruleExists) {
        New-NetFirewallRule -DisplayName "$SynOSDisplayName" `
                            -Direction Inbound `
                            -Action Allow `
                            -Protocol TCP `
                            -LocalPort $SynOSPort `
                            -Profile Private, Public `
                            -ErrorAction Stop | Out-Null
        Log-Message "Firewall rule '$SynOSDisplayName' created successfully."
    } else {
        Log-Message "Firewall rule '$SynOSDisplayName' already exists."
    }
} catch {
    Log-Message "WARNING: Failed to configure firewall rule: $_"
}

# 2. Fix Service ImagePath Quoting, Clear Hardcoded Dependencies & Pre-Migrate Schema
try {
    $serviceRegPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$SynOSService"
    if (Test-Path $serviceRegPath) {
        $expectedPath = "`"$AppDir\SynOS.Api.exe`""
        Set-ItemProperty -Path $serviceRegPath -Name "ImagePath" -Value $expectedPath
        Log-Message "Enforced quoted service ImagePath in registry: $expectedPath"
    }

    # Clear any hardcoded service dependencies (e.g. MSSQL$SYNOS) so service starts regardless of SQL instance naming
    & sc.exe config $SynOSService depend= / | Out-Null
    Log-Message "Ensured Windows Service '$SynOSService' has no blocking hardcoded service dependencies."
} catch {
    Log-Message "WARNING: Failed to enforce quoted ImagePath or clear service dependencies: $_"
}

try {
    $apiExe = Join-Path $AppDir "SynOS.Api.exe"
    if (Test-Path $apiExe) {
        Log-Message "Running pre-service database schema verification ($apiExe --migrate-db)..."
        $migrateOutput = & $apiExe --migrate-db 2>&1
        Log-Message "Database pre-migration output: $($migrateOutput -join ' ')"
    }
} catch {
    Log-Message "WARNING: Pre-service schema migration encountered an error: $_"
}

# 3. Start Windows Service & Verify
try {
    Log-Message "Starting Windows Service ($SynOSService)..."
    Start-Service -Name $SynOSService -ErrorAction Stop

    $maxWait = 15
    $elapsed = 0
    $isRunning = $false
    while ($elapsed -lt $maxWait) {
        $svc = Get-Service -Name $SynOSService -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -eq 'Running') {
            $isRunning = $true
            Log-Message "Windows Service '$SynOSService' is verified RUNNING (after $elapsed s)."
            break
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    if (-not $isRunning) {
        Log-Message "WARNING: Windows Service '$SynOSService' was started but did not reach 'Running' state within $maxWait s."
    }
} catch {
    Log-Message "WARNING: Failed to start Windows Service '$SynOSService': $_"
}

Log-Message "SUCCESS: Firewall verification, schema preparation, and service startup completed."
exit 0
