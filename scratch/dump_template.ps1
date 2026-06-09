$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT TemplateJson FROM ReportTemplates WHERE Name = 'Pathology_Standard_1Column'"
$res = $cmd.ExecuteScalar()
$conn.Close()
[System.IO.File]::WriteAllText("scratch/pathology_standard_1column.json", $res)
