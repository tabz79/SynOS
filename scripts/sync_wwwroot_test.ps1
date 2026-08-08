# Temporary sync test
Write-Host '--- 1. STOPPING SERVICE ---'
Stop-Service -Name 'TBZSynOSService' -Force -ErrorAction SilentlyContinue
Get-Process -Name 'SynOS.Api' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host '--- 2. PURGING INSTALLED WWWROOT ---'
Remove-Item -Path 'C:\Program Files\TBZ Labs\SynOS\wwwroot\*' -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host '--- 3. COPYING PUBLISHED WWWROOT ---'
Copy-Item -Path 'd:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\bin\Release\net8.0\win-x64\publish\wwwroot\*' -Destination 'C:\Program Files\TBZ Labs\SynOS\wwwroot' -Recurse -Force

Write-Host '--- 4. STARTING SERVICE ---'
Start-Service -Name 'TBZSynOSService' -ErrorAction SilentlyContinue

Write-Host '--- 5. VERIFYING INSTALLED INDEX.HTML ---'
$installed = Get-Content 'C:\Program Files\TBZ Labs\SynOS\wwwroot\index.html' -Raw
$published = Get-Content 'd:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\bin\Release\net8.0\win-x64\publish\wwwroot\index.html' -Raw

Write-Host "INSTALLED: $installed"

$h1 = (Get-FileHash 'C:\Program Files\TBZ Labs\SynOS\wwwroot\index.html').Hash
$h2 = (Get-FileHash 'd:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\bin\Release\net8.0\win-x64\publish\wwwroot\index.html').Hash

Write-Host "Hash Installed: $h1"
Write-Host "Hash Published: $h2"

if ($h1 -eq $h2) {
    Write-Host 'SUCCESS! Installed index.html EXACTLY MATCHES published index.html!'
} else {
    Write-Host 'ERROR: Mismatch still exists!'
}
