$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT Summary, Notes FROM ReportInterpretations WHERE ReportId = '2ca711ba-a0c5-46d9-bb54-10adc58a1ac7'"
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$table = New-Object System.Data.DataTable
[void]$adapter.Fill($table)
$conn.Close()
$row = $table.Rows[0]
Write-Output "SUMMARY:"
Write-Output $row["Summary"]
Write-Output "NOTES:"
Write-Output $row["Notes"]
