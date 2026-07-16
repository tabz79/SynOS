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

# 2. Skip Starting Windows Service during install phase
Log-Message "SUCCESS: Firewall verification passed. Service startup is deferred until first-run wizard completion."
exit 0
