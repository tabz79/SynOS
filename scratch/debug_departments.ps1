$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT r.ReportId, r.Status, r.Department, p.FirstName, p.LastName FROM Reports r JOIN Patients p ON r.PatientId = p.PatientId WHERE p.FirstName LIKE '%Debug%'"
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$table = New-Object System.Data.DataTable
[void]$adapter.Fill($table)
$conn.Close()
$output = $table | Format-Table -AutoSize | Out-String
[System.IO.File]::WriteAllText("scratch/debug_departments.txt", $output)
