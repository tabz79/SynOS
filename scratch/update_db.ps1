$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()

$cmd = $conn.CreateCommand()
$cmd.CommandText = "UPDATE Tests SET ReportTemplateId = 'e07bd2c8-2ed5-4980-ab43-420b9862bd35' WHERE TestCode = 'HAEMOGRAM'"
$rows = $cmd.ExecuteNonQuery()
Write-Host "Updated $rows rows in Tests table"

$conn.Close()
