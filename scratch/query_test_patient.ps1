$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT r.ReportId, r.Status, r.Department, p.FirstName, p.LastName, v.Token FROM Reports r JOIN Patients p ON r.PatientId = p.PatientId JOIN Visits v ON r.VisitId = v.VisitId WHERE p.FirstName LIKE '%Test%' OR v.Token = 'MAI-001'"
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$table = New-Object System.Data.DataTable
[void]$adapter.Fill($table)
$conn.Close()
$output = $table | Format-Table -AutoSize | Out-String
[System.IO.File]::WriteAllText("scratch/test_patient_reports.txt", $output)
