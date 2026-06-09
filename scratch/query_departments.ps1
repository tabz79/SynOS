$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT DepartmentId, Code, Name, MacroDepartment FROM DepartmentMasters"
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$table = New-Object System.Data.DataTable
[void]$adapter.Fill($table)
$conn.Close()
$output = $table | Format-Table -AutoSize | Out-String
[System.IO.File]::WriteAllText("scratch/department_masters.txt", $output)
