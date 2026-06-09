$conn = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;")
$conn.Open()

# 1. Set all Pathology templates to IsDefault = 0
$cmd1 = $conn.CreateCommand()
$cmd1.CommandText = "UPDATE ReportTemplates SET IsDefault = 0 WHERE Modality = 'Pathology'"
$rows1 = $cmd1.ExecuteNonQuery()
Write-Output "Cleared default flag from $rows1 pathology templates."

# 2. Set Pathology_Detailed_2Column to IsDefault = 1 and IsPublished = 1
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "UPDATE ReportTemplates SET IsDefault = 1, IsPublished = 1 WHERE Name = 'Pathology_Detailed_2Column'"
$rows2 = $cmd2.ExecuteNonQuery()
Write-Output "Set Pathology_Detailed_2Column as default and published ($rows2 row affected)."

$conn.Close()
