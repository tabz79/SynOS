$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT TemplateJson FROM ReportTemplates WHERE Modality = 'Radiology'"
$res = $cmd.ExecuteScalar()
$conn.Close()
$res
