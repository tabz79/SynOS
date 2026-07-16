# install-prereqs.ps1
# This script is executed by the SynOS Installer to verify database prerequisites,
# download (or use bundled media) and silently install SQL Server Express if it is not present on the machine.

param (
    [string]$LogFile = "",
    [bool]$UseExistingSql = $false,
    [string]$InstanceName = "SQLEXPRESS",
    [string]$LocalPackagePath = ""
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
}

# Resolve Log File Path
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
    $logLine = "[$timestamp] [PREREQ] $Message"
    Write-Output $logLine
    Add-Content -Path $LogFile -Value $logLine -ErrorAction SilentlyContinue
}

Log-Message "=================================================="
Log-Message "Prerequisite Checker Started."
Log-Message "Target SQL Instance: $InstanceName"

if ($UseExistingSql) {
    Log-Message "User selected: Use Existing SQL Server ($InstanceName). Skipping database installation."
    Log-Message "Prerequisite check completed successfully."
    exit 0
}

Log-Message "Checking local SQL Server ($InstanceName) installation..."

# 1. Detect SQL Server Instance
$sqlInstalled = $false
try {
    # Check services for SQL Server
    $sqlService = Get-Service -Name "MSSQL`*$InstanceName`*" -ErrorAction SilentlyContinue
    if ($sqlService) {
        $sqlInstalled = $true
        Log-Message "SQL Server ($InstanceName) service detected. Status: $($sqlService.Status)"
    } else {
        # Check registry keys
        $regPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL"
        if (Test-Path $regPath) {
            $instances = Get-ItemProperty -Path $regPath -ErrorAction SilentlyContinue
            if ($instances.$InstanceName) {
                $sqlInstalled = $true
                Log-Message "SQL Server $InstanceName instance detected in Registry."
            }
        }
    }
} catch {
    Log-Message "WARNING: Error checking SQL Server installation: $_"
}

# 2. Silently Install SQL Server Express if missing
if (-not $sqlInstalled) {
    Log-Message "SQL Server Express $InstanceName instance was NOT detected on this machine."
    
    $tempDir = Join-Path $env:TEMP "SynOSPrereqs"
    $installerPath = Join-Path $tempDir "SQL2022-SSEI-Expr.exe"
    $downloadTargetDir = Join-Path $tempDir "SQLX"
    $sqlPackagePath = ""

    try {
        if (-not (Test-Path $tempDir)) {
            New-Item -Path $tempDir -ItemType Directory -Force | Out-Null
        }

        # Check if local installer package is provided (Offline Installer Mode)
        if (-not [string]::IsNullOrWhiteSpace($LocalPackagePath) -and (Test-Path $LocalPackagePath)) {
            Log-Message "Offline installation mode: Using bundled local database package at: $LocalPackagePath"
            $sqlPackagePath = $LocalPackagePath
        } else {
            Log-Message "Online installation mode: Downloading Microsoft SQL Server Express Bootstrapper..."
            $downloadUrl = "https://download.microsoft.com/download/7/c/1/7c14e92e-bdcb-4f89-b7cf-93543e471222/SQL2022-SSEI-Expr.exe"
            Log-Message "Source URL: $downloadUrl"
            Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -ErrorAction Stop
            Log-Message "Download completed successfully."

            Log-Message "Extracting and downloading SQL Server Express media files silently..."
            $downloadArgs = "/Action=Download /MediaType=ExpressAdv /Language=ENU /Quiet /TargetDir=""$downloadTargetDir"""
            $process = Start-Process -FilePath $installerPath -ArgumentList $downloadArgs -Wait -PassThru -NoNewWindow
            
            if ($process.ExitCode -ne 0) {
                Log-Message "ERROR: Bootstrapper media download failed with exit code: $($process.ExitCode)"
                exit 1
            }
            
            $sqlPackage = Get-ChildItem -Path $downloadTargetDir -Filter "SQLEXPR_x64_ENU.exe" -Recurse | Select-Object -First 1
            if (-not $sqlPackage) {
                Log-Message "ERROR: Could not locate SQLEXPR_x64_ENU.exe in downloaded media."
                exit 1
            }
            $sqlPackagePath = $sqlPackage.FullName
        }
        
        Log-Message "Installing SQL Server Express $InstanceName instance silently..."
        $installArgs = "/QS /ACTION=Install /FEATURES=SQL /INSTANCENAME=$InstanceName /SQLSVCACCOUNT=""NT AUTHORITY\NetworkService"" /SQLSYSADMINACCOUNTS=""BUILTIN\Administrators"" /TCPENABLED=1 /IACCEPTSQLSERVERLICENSETERMS"
        Log-Message "Running installation file: $sqlPackagePath with args: $installArgs"
        
        $installProcess = Start-Process -FilePath $sqlPackagePath -ArgumentList $installArgs -Wait -PassThru -NoNewWindow
        Log-Message "SQL Server Express installation completed. Exit Code: $($installProcess.ExitCode)"
        
        if ($installProcess.ExitCode -ne 0) {
            Log-Message "ERROR: SQL Server installation failed with exit code $($installProcess.ExitCode)"
            exit 1
        }
        
        Start-Service -Name "*$InstanceName*" -ErrorAction SilentlyContinue
        Log-Message "SUCCESS: SQL Server Express setup successfully finished."
        
    } catch {
        Log-Message "CRITICAL ERROR: Failed to install SQL Server Express: $_"
        exit 1
    } finally {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Log-Message "SQL Server Express instance ($InstanceName) is already configured. Skipping installation."
}

Log-Message "Prerequisite check completed successfully."
exit 0
