$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT TemplateJson FROM ReportTemplates WHERE Name = 'Pathology_Detailed_2Column'"
$res = $cmd.ExecuteScalar()
$conn.Close()
if ($res) {
    [System.IO.File]::WriteAllText("scratch/pathology_detailed_2column.json", $res)
} else {
    [System.IO.File]::WriteAllText("scratch/pathology_detailed_2column.json", "{}")
}
