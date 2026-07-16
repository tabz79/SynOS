# import-config.ps1
# Unpacks and restores SynOS On-Premise configuration files, sqlite settings databases, and templates from a backup zip.

param (
    [string]$BackupZipPath = "",
    [string]$AppDir = "C:\Program Files\TBZ Labs\SynOS"
)

$ProgramDataDir = "C:\ProgramData\TBZ Labs\SynOS"
$TemplatesDir = "C:\SynOS_Files\templates"
$SynOSService = "TBZSynOSService"

function Log-Message {
    param([string]$Message)
    Write-Host "[IMPORT] $Message"
}

if ([string]::IsNullOrWhiteSpace($BackupZipPath) -or -not (Test-Path $BackupZipPath)) {
    Log-Message "ERROR: Configuration backup zip path is missing or invalid: $BackupZipPath"
    exit 1
}

Log-Message "Starting configuration import from $BackupZipPath..."
Log-Message "Target AppDir: $AppDir"

# Stop service if running
$service = Get-Service -Name $SynOSService -ErrorAction SilentlyContinue
$serviceWasRunning = $false
if ($service -and $service.Status -eq "Running") {
    Log-Message "Stopping $SynOSService Windows Service..."
    Stop-Service -Name $SynOSService -Force -ErrorAction SilentlyContinue
    $serviceWasRunning = $true
}

$tempExtractDir = Join-Path $env:TEMP "SynOSConfigImport"
if (Test-Path $tempExtractDir) {
    Remove-Item -Path $tempExtractDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -Path $tempExtractDir -ItemType Directory -Force | Out-Null

try {
    # Extract Archive
    Log-Message "Extracting config zip..."
    Expand-Archive -Path $BackupZipPath -DestinationPath $tempExtractDir -Force
    
    # 1. Restore appsettings.json
    $srcSettings = Join-Path $tempExtractDir "appsettings.json"
    if (Test-Path $srcSettings) {
        Copy-Item -Path $srcSettings -Destination $AppDir -Force
        Log-Message "Restored appsettings.json to $AppDir"
    }

    # 2. Restore thermal_settings.json
    $srcThermal = Join-Path $tempExtractDir "thermal_settings.json"
    if (Test-Path $srcThermal) {
        Copy-Item -Path $srcThermal -Destination $AppDir -Force
        Log-Message "Restored thermal_settings.json to $AppDir"
    }

    # 3. Restore SQLite database
    $srcDb = Join-Path $tempExtractDir "MiddlewareDb.db"
    if (Test-Path $srcDb) {
        # Check standard config folder
        $configDir = Join-Path $ProgramDataDir "Config"
        if (-not (Test-Path $configDir)) {
            New-Item -Path $configDir -ItemType Directory -Force | Out-Null
        }
        Copy-Item -Path $srcDb -Destination $configDir -Force
        Log-Message "Restored MiddlewareDb.db to $configDir"
    }

    # 4. Restore custom templates folder
    $srcTemplates = Join-Path $tempExtractDir "templates"
    if (Test-Path $srcTemplates) {
        if (-not (Test-Path $TemplatesDir)) {
            New-Item -Path $TemplatesDir -ItemType Directory -Force | Out-Null
        }
        Copy-Item -Path "$srcTemplates\*" -Destination $TemplatesDir -Recurse -Force
        Log-Message "Restored custom templates to $TemplatesDir"
    }

    Log-Message "SUCCESS: Configuration import finished successfully."
    
    # Restart service if it was running previously
    if ($serviceWasRunning) {
        Log-Message "Starting $SynOSService Windows Service..."
        Start-Service -Name $SynOSService -ErrorAction SilentlyContinue
    }
    
    exit 0
} catch {
    Log-Message "ERROR: Configuration import failed: $_"
    exit 1
} finally {
    Remove-Item -Path $tempExtractDir -Recurse -Force -ErrorAction SilentlyContinue
}
