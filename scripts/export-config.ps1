# export-config.ps1
# Packages all SynOS On-Premise configurations, sqlite settings database, and report templates into a single zip.

param (
    [string]$AppDir = "C:\Program Files\TBZ Labs\SynOS",
    [string]$OutputPath = ""
)

$ProgramDataDir = "C:\ProgramData\TBZ Labs\SynOS"
$TemplatesDir = "C:\SynOS_Files\templates"

function Log-Message {
    param([string]$Message)
    Write-Host "[EXPORT] $Message"
}

# Resolve Output File Name
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "SynOS_Config_Backup.zip"
}

Log-Message "Starting configuration export..."
Log-Message "AppDir: $AppDir"
Log-Message "OutputPath: $OutputPath"

$tempZipDir = Join-Path $env:TEMP "SynOSConfigExport"
if (Test-Path $tempZipDir) {
    Remove-Item -Path $tempZipDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -Path $tempZipDir -ItemType Directory -Force | Out-Null

try {
    # 1. Copy appsettings.json
    $settingsPath = Join-Path $AppDir "appsettings.json"
    if (Test-Path $settingsPath) {
        Copy-Item -Path $settingsPath -Destination (Join-Path $tempZipDir "appsettings.json") -Force
        Log-Message "Copied appsettings.json"
    }

    # 2. Copy thermal_settings.json
    $thermalPath = Join-Path $AppDir "thermal_settings.json"
    if (Test-Path $thermalPath) {
        Copy-Item -Path $thermalPath -Destination (Join-Path $tempZipDir "thermal_settings.json") -Force
        Log-Message "Copied thermal_settings.json"
    }

    # 3. Copy SQLite Middleware Database (if exists)
    # Check common locations: C:\Program Files\TBZ Labs\SynOS or C:\ProgramData\TBZ Labs\SynOS
    $dbName = "MiddlewareDb.db"
    $dbPaths = @(
        (Join-Path $AppDir $dbName),
        (Join-Path $ProgramDataDir "Config\$dbName"),
        (Join-Path $ProgramDataDir $dbName)
    )
    
    $dbFound = $false
    foreach ($path in $dbPaths) {
        if (Test-Path $path) {
            Copy-Item -Path $path -Destination (Join-Path $tempZipDir $dbName) -Force
            Log-Message "Copied SQLite Middleware database: $path"
            $dbFound = $true
            break
        }
    }

    # 4. Copy custom templates folder
    if (Test-Path $TemplatesDir) {
        $destTemplates = Join-Path $tempZipDir "templates"
        Copy-Item -Path $TemplatesDir -Destination $destTemplates -Recurse -Force
        Log-Message "Copied report templates folder"
    }

    # 5. Compress to ZIP
    if (Test-Path $OutputPath) {
        Remove-Item -Path $OutputPath -Force -ErrorAction SilentlyContinue
    }
    Compress-Archive -Path "$tempZipDir\*" -DestinationPath $OutputPath -Force
    Log-Message "SUCCESS: Configuration backup created at: $OutputPath"
    
} catch {
    Log-Message "ERROR: Configuration export failed: $_"
} finally {
    Remove-Item -Path $tempZipDir -Recurse -Force -ErrorAction SilentlyContinue
}
