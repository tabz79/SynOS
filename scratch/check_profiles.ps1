$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT TestId, TestCode, TestName, IsProfile, ReportTemplateId FROM Tests WHERE IsProfile = 1"
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$table = New-Object System.Data.DataTable
[void]$adapter.Fill($table)
$conn.Close()
$table | Format-Table -AutoSize
