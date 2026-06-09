$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT ri.ReportId, ri.Summary, ri.Notes, p.FirstName, p.LastName FROM ReportInterpretations ri JOIN Reports r ON ri.ReportId = r.ReportId JOIN Patients p ON r.PatientId = p.PatientId WHERE p.FirstName LIKE '%Test%'"
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$table = New-Object System.Data.DataTable
[void]$adapter.Fill($table)
$conn.Close()
$output = $table | Format-Table -AutoSize | Out-String
[System.IO.File]::WriteAllText("scratch/report_interpretations.txt", $output)
