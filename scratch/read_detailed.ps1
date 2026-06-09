$jsonStr = [System.IO.File]::ReadAllText("scratch/db_template_Pathology_Detailed_2Column.json")
$json = ConvertFrom-Json $jsonStr
$header = $json.sections | Where-Object { $_.type -eq "Header" }
$header.config | Format-List | Out-String | Out-File -FilePath "scratch/detailed_config.txt"
