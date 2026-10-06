# install-prereqs.ps1
# This script is executed by the SynOS Installer to verify database prerequisites,
# download (or use bundled media) and silently install SQL Server Express if it is not present on the machine.

param (
    [string]$LogFile = "",
    [string]$UseExistingSql = "false",
    [string]$InstanceName = "SYNOS",
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

$useExisting = $false
if ($UseExistingSql -eq "true" -or $UseExistingSql -eq "1" -or $UseExistingSql -eq "$true") {
    $useExisting = $true
}

if ($useExisting) {
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
            Log-Message "Online installation mode: Downloading Microsoft SQL Server Express Core offline installer package directly..."
            $downloadUrl = "https://download.microsoft.com/download/3/8/d/38de7036-2433-4207-8eae-06e247e17b25/SQLEXPR_x64_ENU.exe"
            Log-Message "Source URL: $downloadUrl"
            $sqlPackagePath = Join-Path $tempDir "SQLEXPR_x64_ENU.exe"
            
            Log-Message "Using System.Net.WebClient for non-interactive download..."
            $webClient = New-Object System.Net.WebClient
            $webClient.DownloadFile($downloadUrl, $sqlPackagePath)
            
            Log-Message "Download completed successfully to: $sqlPackagePath"
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

# 2. Check and Install .NET 8.0 ASP.NET Core Runtime / Hosting Bundle if missing
Log-Message "Checking .NET 8.0 ASP.NET Core runtime..."
$dotnetInstalled = $false
try {
    $dotnetExe = "C:\Program Files\dotnet\dotnet.exe"
    if (Test-Path $dotnetExe) {
        $runtimes = & $dotnetExe --list-runtimes 2>&1
        if ($runtimes -match "Microsoft\.AspNetCore\.App\s+8\.") {
            $dotnetInstalled = $true
            Log-Message ".NET 8.0 ASP.NET Core runtime is present."
        }
    }
} catch {
    Log-Message "WARNING: Error checking .NET runtimes: $_"
}

if (-not $dotnetInstalled) {
    Log-Message ".NET 8.0 ASP.NET Core Runtime not found. Attempting automated installation..."
    $installedViaWinget = $false
    try {
        $wingetCmd = Get-Command winget.exe -ErrorAction SilentlyContinue
        if ($wingetCmd) {
            Log-Message "Installing Microsoft.DotNet.HostingBundle.8 via winget..."
            $wingetProcess = Start-Process -FilePath "winget.exe" -ArgumentList "install Microsoft.DotNet.HostingBundle.8 --silent --accept-source-agreements --accept-package-agreements" -Wait -PassThru -NoNewWindow
            if ($wingetProcess.ExitCode -eq 0) {
                $installedViaWinget = $true
                Log-Message "SUCCESS: .NET 8 Hosting Bundle installed via winget."
            }
        }
    } catch {
        Log-Message "winget installation attempt failed: $_"
    }

    if (-not $installedViaWinget) {
        try {
            $tempDotnetDir = "C:\ProgramData\TBZ Labs\SynOS\Temp\DotnetPrereq"
            New-Item -Path $tempDotnetDir -ItemType Directory -Force | Out-Null
            $installerPath = Join-Path $tempDotnetDir "dotnet-hosting-8.0-win.exe"
            $dotnetUrl = "https://download.visualstudio.microsoft.com/download/pr/9e3a79d3-f54c-4740-b6f7-1ba36a3070aa/2070f7cf479caad5cfeb908d1797d197/dotnet-hosting-8.0.12-win.exe"
            Log-Message "Downloading .NET 8.0 Hosting Bundle from Microsoft: $dotnetUrl"
            $webClient = New-Object System.Net.WebClient
            $webClient.DownloadFile($dotnetUrl, $installerPath)
            Log-Message "Installing .NET 8.0 Hosting Bundle silently..."
            $installProcess = Start-Process -FilePath $installerPath -ArgumentList "/install /quiet /norestart" -Wait -PassThru -NoNewWindow
            Log-Message ".NET Hosting Bundle installer finished with exit code: $($installProcess.ExitCode)"
        } catch {
            Log-Message "WARNING: Automated .NET 8 download/install encountered error: $_"
        } finally {
            Remove-Item -Path $tempDotnetDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Log-Message "Prerequisite check completed successfully."
exit 0
