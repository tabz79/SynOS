param(
    [string]$InstanceName = "SYNOS",
    [string]$OutputFile = ""
)

$server = if ($InstanceName -match '^\.') { $InstanceName } else { ".\$InstanceName" }
$connStr = "Server=$server;Integrated Security=True;TrustServerCertificate=True;Connection Timeout=5;"
$databases = [System.Collections.Generic.List[string]]::new()

try {
    $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT name FROM sys.databases WHERE state = 0 AND name NOT IN ('master', 'tempdb', 'model', 'msdb') ORDER BY create_date DESC"
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
        $databases.Add($reader.GetString(0))
    }
    $reader.Close()
    $conn.Close()
}
catch {
    Write-Warning "Could not query SQL Server instance $InstanceName : $_"
}

if ($OutputFile) {
    [System.IO.File]::WriteAllLines($OutputFile, $databases)
} else {
    $databases
}
