$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT Summary, Notes FROM ReportInterpretations WHERE ReportId = '2ca711ba-a0c5-46d9-bb54-10adc58a1ac7'"
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$table = New-Object System.Data.DataTable
[void]$adapter.Fill($table)
$conn.Close()
$row = $table.Rows[0]
$output = "SUMMARY:`r`n" + $row["Summary"] + "`r`n`r`nNOTES:`r`n" + $row["Notes"]
[System.IO.File]::WriteAllText("scratch/one_report_detail.txt", $output)
