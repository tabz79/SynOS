$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()

Write-Host "--- Tests Table Columns ---"
$cmd1 = $conn.CreateCommand()
$cmd1.CommandText = "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Tests'"
$adapter1 = New-Object System.Data.SqlClient.SqlDataAdapter($cmd1)
$table1 = New-Object System.Data.DataTable
[void]$adapter1.Fill($table1)
$table1 | Format-Table -AutoSize

Write-Host "--- Catalog_Tests Table Columns ---"
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Catalog_Tests'"
$adapter2 = New-Object System.Data.SqlClient.SqlDataAdapter($cmd2)
$table2 = New-Object System.Data.DataTable
[void]$adapter2.Fill($table2)
$table2 | Format-Table -AutoSize

$conn.Close()
