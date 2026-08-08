# Script to sync published frontend to installed location and verify
Write-Host "=== 1. STOPPING SERVICE & KILLING PROCESSES ==="
Stop-Service -Name "TBZSynOSService" -Force -ErrorAction SilentlyContinue
Get-Process -Name "SynOS.Api" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "=== 2. ROBOCOPY MIRROR TO C:\Program Files\TBZ Labs\SynOS\wwwroot ==="
$src = "d:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\bin\Release\net8.0\win-x64\publish\wwwroot"
$dest = "C:\Program Files\TBZ Labs\SynOS\wwwroot"

cmd /c "robocopy `"$src`" `"$dest`" /MIR /R:2 /W:1"

Write-Host "=== 3. STARTING SERVICE ==="
Start-Service -Name "TBZSynOSService" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

Write-Host "=== 4. VERIFYING INSTALLED INDEX.HTML ==="
$installed = Get-Content "$dest\index.html" -Raw
$published = Get-Content "$src\index.html" -Raw

$h1 = (Get-FileHash "$dest\index.html").Hash
$h2 = (Get-FileHash "$src\index.html").Hash

Write-Host "Installed Hash: $h1"
Write-Host "Published Hash: $h2"

if ($h1 -eq $h2) {
    Write-Host "VERIFICATION SUCCESS: Installed index.html EXACTLY MATCHES Published index.html!"
} else {
    Write-Host "VERIFICATION FAILED: Hashes differ."
}
