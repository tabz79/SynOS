# Run this script in PowerShell as Administrator!

$serviceName = "TBZSynOSService"
$sourcePath = "D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\bin\Debug\net8.0"
$destPath = "C:\Program Files\TBZ Labs\SynOS"

try {
    Write-Host "1. Stopping the Windows service '$serviceName'..." -ForegroundColor Cyan
    Stop-Service -Name $serviceName -ErrorAction SilentlyContinue

    Write-Host "2. Copying the newly compiled binaries to '$destPath'..." -ForegroundColor Cyan
    Copy-Item -Path "$sourcePath\*" -Destination $destPath -Recurse -Force -ErrorAction Stop

    Write-Host "3. Restarting the Windows service '$serviceName'..." -ForegroundColor Cyan
    Start-Service -Name $serviceName -ErrorAction Stop

    Write-Host "SUCCESS: SynOS Service updated and started successfully!" -ForegroundColor Green
}
catch {
    Write-Error "Failed to update service: $_"
}
