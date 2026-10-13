# Run this script in PowerShell as Administrator!

$serviceName = "TBZSynOSService"
$sourcePath = "D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\bin\Debug\net8.0"
$destPath = "C:\Program Files\TBZ Labs\SynOS"
$wwwrootSrc = "D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\wwwroot"
$wwwrootDest = "C:\Program Files\TBZ Labs\SynOS\wwwroot"

try {
    Write-Host "1. Stopping the Windows service '$serviceName'..." -ForegroundColor Cyan
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    Get-Process -Name "SynOS.Api" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    Write-Host "2. Copying the newly compiled binaries to '$destPath'..." -ForegroundColor Cyan
    Copy-Item -Path "$sourcePath\*" -Destination $destPath -Recurse -Force -ErrorAction Stop

    Write-Host "3. Copying wwwroot assets to '$wwwrootDest'..." -ForegroundColor Cyan
    cmd /c "robocopy `"$wwwrootSrc`" `"$wwwrootDest`" /MIR /R:2 /W:1"

    Write-Host "4. Restarting the Windows service '$serviceName'..." -ForegroundColor Cyan
    Start-Service -Name $serviceName -ErrorAction Stop

    Write-Host "SUCCESS: SynOS Service updated and started successfully!" -ForegroundColor Green
}
catch {
    Write-Error "Failed to update service: $_"
}
