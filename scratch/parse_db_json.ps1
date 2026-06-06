$json = Get-Content "scratch/db_json.txt" -Raw | ConvertFrom-Json
$headerSection = $json.sections | Where-Object { $_.type -eq "Header" }
$headerConfig = $headerSection.config
Write-Output "Header Config Keys and Values:"
Write-Output "usePreprinted: $($headerConfig.usePreprinted)"
Write-Output "includeBranding: $($headerConfig.includeBranding)"
Write-Output "density: $($headerConfig.density)"
Write-Output "Title: $($headerConfig.Title)"
Write-Output "ShowLogo: $($headerConfig.ShowLogo)"
