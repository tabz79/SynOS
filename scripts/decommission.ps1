# decommission.ps1
# This script is executed by the SynOS Uninstaller to perform clean decommissioning
# of services, firewall rules, and optionally delete databases, report files, PACS folders, and backups.

param (
    [bool]$RemoveDb = $false,
    [bool]$RemoveReports = $false,
    [bool]$RemovePacs = $false,
    [bool]$RemoveBackups = $false,
    [string]$AppDir = "",
    [string]$LogFile = "",
    [string]$InstanceName = "SQLEXPRESS"
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
    $SynOSDbName = "SynOSDb"
}

# Resolve Log File Path
if ([string]::IsNullOrWhiteSpace($LogFile)) {
    $ProgramDataLogs = "C:\ProgramData\TBZ Labs\SynOS\Logs"
    if (-not (Test-Path $ProgramDataLogs)) {
        New-Item -Path $ProgramDataLogs -ItemType Directory -Force | Out-Null
    }
    $LogFile = Join-Path $ProgramDataLogs "decommission.log"
}

function Log-Message {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] [DECOMMISSION] $Message"
    Write-Output $logLine
    Add-Content -Path $LogFile -Value $logLine -ErrorAction SilentlyContinue
}

Log-Message "=================================================="
Log-Message "Decommissioning script started."
Log-Message "App Directory: $AppDir"
Log-Message "Options - RemoveDb: $RemoveDb, RemoveReports: $RemoveReports, RemovePacs: $RemovePacs, RemoveBackups: $RemoveBackups"

# 1. Stop and Delete Windows Service
try {
    Log-Message "Stopping SynOS Windows Service ($SynOSService)..."
    $service = Get-Service -Name $SynOSService -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            Stop-Service -Name $SynOSService -Force -ErrorAction Stop
            Log-Message "SynOS Service stopped."
        }
        Log-Message "Removing SynOS Windows Service..."
        sc.exe delete $SynOSService | Out-String | Log-Message
    } else {
        Log-Message "SynOS Windows Service is not installed."
    }
} catch {
    Log-Message "ERROR during service removal: $_"
}

# 2. Remove Firewall Exception
try {
    Log-Message "Removing firewall rule '$SynOSDisplayName' on port $SynOSPort..."
    $ruleExists = Get-NetFirewallRule -DisplayName "$SynOSDisplayName" -ErrorAction SilentlyContinue
    if ($ruleExists) {
        Remove-NetFirewallRule -DisplayName "$SynOSDisplayName" -ErrorAction Stop
        Log-Message "Firewall rule removed successfully."
    } else {
        Log-Message "Firewall rule not found."
    }
} catch {
    Log-Message "WARNING: Failed to remove firewall rule: $_"
}

# 3. Optional Database removal
if ($RemoveDb) {
    Log-Message "Database removal requested. Connecting to local SQL Server ($InstanceName) to drop database [$SynOSDbName]..."
    try {
        # Drop database via SQL command
        $sqlCmd = "IF EXISTS(SELECT * FROM sys.databases WHERE name='$SynOSDbName') BEGIN ALTER DATABASE [$SynOSDbName] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$SynOSDbName]; END"
        Invoke-Sqlcmd -Query $sqlCmd -ServerInstance ".\$InstanceName" -ErrorAction Stop
        Log-Message "SQL Server database [$SynOSDbName] dropped successfully."
    } catch {
        Log-Message "WARNING: Failed to drop database via SQL command: $_"
    }
} else {
    Log-Message "Database preservation requested. Local database is left intact."
}

# 4. Optional Storage & PACS removal
# Note: These paths are read from appsettings.json or are defaults
$pacsFolder = "D:\SynOS\Pacs"
$reportsFolder = "C:\SynOS_Files"
$backupFolder = "C:\ProgramData\TBZ Labs\SynOS\Backups"

if ($RemoveReports) {
    if (Test-Path $reportsFolder) {
        Log-Message "Removing PDF reports folder: $reportsFolder"
        Remove-Item -Path $reportsFolder -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Log-Message "PDF reports folder preserved: $reportsFolder"
}

if ($RemovePacs) {
    if (Test-Path $pacsFolder) {
        Log-Message "Removing PACS storage folder: $pacsFolder"
        Remove-Item -Path $pacsFolder -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Log-Message "PACS storage folder preserved: $pacsFolder"
}

if ($RemoveBackups) {
    if (Test-Path $backupFolder) {
        Log-Message "Removing updates backup folder: $backupFolder"
        Remove-Item -Path $backupFolder -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Log-Message "Updates backup folder preserved: $backupFolder"
}

Log-Message "Decommissioning completed successfully."
exit 0
