$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()

Write-Host "--- Tests Table Query ---"
$cmd1 = $conn.CreateCommand()
$cmd1.CommandText = "SELECT TestId, TestCode, TestName, ReportTemplateId, DefaultInterpretation FROM Tests WHERE TestCode = 'HAEMOGRAM'"
$adapter1 = New-Object System.Data.SqlClient.SqlDataAdapter($cmd1)
$table1 = New-Object System.Data.DataTable
[void]$adapter1.Fill($table1)
$table1 | Format-List

Write-Host "--- Catalog_Tests Table Query ---"
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT TestCode, TestName, DefaultInterpretation FROM Catalog_Tests WHERE TestCode = 'HAEMOGRAM'"
$adapter2 = New-Object System.Data.SqlClient.SqlDataAdapter($cmd2)
$table2 = New-Object System.Data.DataTable
[void]$adapter2.Fill($table2)
$table2 | Format-List

$conn.Close()
