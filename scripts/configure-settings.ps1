# configure-settings.ps1
# Updates connection strings and folder locations inside appsettings.json post-installation.

param (
    [string]$AppDir = "",
    [string]$DbName = "SynOSDb",
    [string]$InstanceName = "SYNOS",
    [string]$AuthType = "Windows",
    [string]$Username = "",
    [string]$Password = "",
    [string]$PacsDir = "C:\SynOS_Files\PACS",
    [string]$LogFile = ""
)

# Resolve Log File
if ([string]::IsNullOrWhiteSpace($LogFile)) {
    $LogFile = "C:\ProgramData\TBZ Labs\SynOS\Logs\install.log"
}

function Log-Message {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] [CONFIG] $Message"
    Write-Output $logLine
    Add-Content -Path $LogFile -Value $logLine -ErrorAction SilentlyContinue
}

Log-Message "=================================================="
Log-Message "Configuring appsettings.json..."
Log-Message "AppDir: $AppDir"
Log-Message "Database: $DbName"
Log-Message "Instance: $InstanceName"
Log-Message "AuthType: $AuthType"
Log-Message "PacsDir: $PacsDir"

try {
    $settingsPath = Join-Path $AppDir "appsettings.json"
    if (-not (Test-Path $settingsPath)) {
        Log-Message "ERROR: appsettings.json not found at $settingsPath"
        exit 1
    }

    # Load JSON settings
    $json = Get-Content -Raw -Path $settingsPath | ConvertFrom-Json
    
    # 0. Generate Secure JWT Secret if using default placeholder
    if ($json.Jwt -and ($json.Jwt.Secret -eq "REPLACE_THIS_WITH_A_REAL_SECRET_REPLACE_THIS_WITH_A_REAL_SECRET" -or $json.Jwt.Secret -like "*REPLACE_THIS_WITH_A_REAL_SECRET*")) {
        $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
        $bytes = New-Object byte[] 32
        $rng.GetBytes($bytes)
        $json.Jwt.Secret = [Convert]::ToBase64String($bytes)
        Log-Message "Generated secure random JWT Secret."
    }
    
    # 1. Build Connection String
    $serverName = ".\$InstanceName"
    if ($InstanceName -ieq "MSSQLSERVER" -or $InstanceName -ieq "(default)" -or [string]::IsNullOrEmpty($InstanceName)) {
        $serverName = "."
    }

    $dbServer = $serverName
    # Force Shared Memory protocol (lpc:) for local connections to allow Windows Service (SYSTEM) authentication
    if ($serverName -eq "." -or $serverName -eq "localhost" -or $serverName -eq "127.0.0.1" -or $serverName -like "*$env:COMPUTERNAME*") {
        if ($serverName -eq ".") {
            $dbServer = "lpc:."
        } else {
            $dbServer = "lpc:$serverName"
        }
    }

    $connStr = ""
    if ($AuthType -eq "SQL") {
        $connStr = "Server=$dbServer;Database=$DbName;User Id=$Username;Password=$Password;MultipleActiveResultSets=true;Encrypt=False;TrustServerCertificate=True"
    } else {
        $connStr = "Server=$dbServer;Database=$DbName;Trusted_Connection=True;MultipleActiveResultSets=true;Encrypt=False;TrustServerCertificate=True"
    }
    
    $json.ConnectionStrings.DefaultConnection = $connStr
    Log-Message "Connection string updated: Server=$dbServer;Database=$DbName"

    # Grant SQL Server login/role permissions to Windows Service accounts if using Windows Auth on local server
    $isLocalServer = ($serverName -eq "." -or $serverName -eq "localhost" -or $serverName -eq "127.0.0.1" -or 
                      $serverName -like ".\*" -or $serverName -like "localhost\*" -or $serverName -like "127.0.0.1\*" -or 
                      $serverName -like "*$env:COMPUTERNAME*")
    if ($AuthType -eq "Windows" -and $isLocalServer) {
        Log-Message "Granting SQL Server permissions to Windows service accounts..."
        try {
            $sqlConnStr = "Server=$serverName;Database=master;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True"
            $sqlConn = New-Object System.Data.SqlClient.SqlConnection($sqlConnStr)
            $sqlConn.Open()
            $sqlCmd = $sqlConn.CreateCommand()
            
            # SYSTEM Login
            $sqlCmd.CommandText = "IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'NT AUTHORITY\SYSTEM') CREATE LOGIN [NT AUTHORITY\SYSTEM] FROM WINDOWS;"
            $sqlCmd.ExecuteNonQuery() | Out-Null
            $sqlCmd.CommandText = "ALTER SERVER ROLE sysadmin ADD MEMBER [NT AUTHORITY\SYSTEM];"
            $sqlCmd.ExecuteNonQuery() | Out-Null
            Log-Message "Granted sysadmin to NT AUTHORITY\SYSTEM"
            
            # NETWORK SERVICE Login
            $sqlCmd.CommandText = "IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'NT AUTHORITY\NETWORK SERVICE') CREATE LOGIN [NT AUTHORITY\NETWORK SERVICE] FROM WINDOWS;"
            $sqlCmd.ExecuteNonQuery() | Out-Null
            $sqlCmd.CommandText = "ALTER SERVER ROLE sysadmin ADD MEMBER [NT AUTHORITY\NETWORK SERVICE];"
            $sqlCmd.ExecuteNonQuery() | Out-Null
            Log-Message "Granted sysadmin to NT AUTHORITY\NETWORK SERVICE"
            
            $sqlConn.Close()
            Log-Message "SUCCESS: SQL Server permissions granted to service accounts."
        } catch {
            Log-Message "WARNING: Failed to automatically grant SQL Server permissions to service accounts: $_"
        }
    }

    # 2. Update PACS storage path and grant permissions
    $filesParentDir = "C:\SynOS_Files"
    if (-not (Test-Path $filesParentDir)) {
        New-Item -Path $filesParentDir -ItemType Directory -Force | Out-Null
    }
    try {
        icacls.exe $filesParentDir /grant "Everyone:(OI)(CI)F" /T /Q
        Log-Message "SUCCESS: Granted full permission on $filesParentDir to Everyone."
    } catch {
        Log-Message "WARNING: Failed to grant permissions on ${filesParentDir}: $_"
    }

    if (-not (Test-Path $PacsDir)) {
        New-Item -Path $PacsDir -ItemType Directory -Force | Out-Null
        Log-Message "Created PACS storage directory: $PacsDir"
    }
    $json.Pacs.RootPath = $PacsDir
    Log-Message "PACS directory path updated: $PacsDir"

    # Save settings back to file
    $json | ConvertTo-Json -Depth 100 | Set-Content -Path $settingsPath -Force
    Log-Message "SUCCESS: appsettings.json updated successfully."
    exit 0
} catch {
    Log-Message "ERROR: Failed to update appsettings.json: $_"
    exit 1
}
