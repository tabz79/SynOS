$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT Name, TemplateJson FROM ReportTemplates"
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$table = New-Object System.Data.DataTable
[void]$adapter.Fill($table)
$conn.Close()
foreach ($row in $table.Rows) {
    $name = $row["Name"]
    $json = $row["TemplateJson"]
    [System.IO.File]::WriteAllText("scratch/db_template_$name.json", $json)
}
