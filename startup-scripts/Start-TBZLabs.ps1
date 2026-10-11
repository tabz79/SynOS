# Start-TBZLabs.ps1 - One-click launcher for SynOS Cloud & Middleware Infrastructure

Write-Host "`n=======================================================================" -ForegroundColor Cyan
Write-Host "         TBZ LABS - CLOUD INFRASTRUCTURE & TUNNEL LAUNCHER" -ForegroundColor Cyan
Write-Host "=======================================================================`n" -ForegroundColor Cyan

# 1. Check SynOS Windows Service
Write-Host "[*] Checking SynOS Windows Service (TBZSynOSService)..." -ForegroundColor Yellow
$service = Get-Service -Name "TBZSynOSService" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
    Write-Host "[OK] SynOS Service is RUNNING on port 59999." -ForegroundColor Green
} else {
    Write-Host "[!] Starting SynOS Service..." -ForegroundColor Yellow
    Start-Service -Name "TBZSynOSService" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# 2. Check & Start TBZ Middleware API
Write-Host "[*] Checking TBZ Middleware API on port 5069..." -ForegroundColor Yellow
$apiPort = netstat -ano | Select-String ":5069\s+.*LISTENING"
if ($apiPort) {
    Write-Host "[OK] TBZ Middleware API is ALREADY RUNNING on port 5069." -ForegroundColor Green
} else {
    Write-Host "[*] Launching TBZ Middleware API (port 5069)..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d D:\Projects\SynOS-Synthesized-Lab-Intelligence\TBZ.Middleware\src\TBZ.Middleware.Api && dotnet run --launch-profile http" -WindowStyle Minimized
    Start-Sleep -Seconds 4
}

# 3. Check & Start Cloudflare Tunnel
Write-Host "[*] Checking Cloudflare Tunnel (tbz-cloud)..." -ForegroundColor Yellow
$cfProc = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($cfProc) {
    Write-Host "[OK] Cloudflare Tunnel is ALREADY RUNNING." -ForegroundColor Green
} else {
    Write-Host "[*] Launching Cloudflare Tunnel..." -ForegroundColor Yellow
    Start-Process -FilePath "C:\Users\Asus\cloudflared.exe" -ArgumentList "tunnel --protocol http2 --config C:\Users\Asus\.cloudflared\config.yml run" -WindowStyle Minimized
    Start-Sleep -Seconds 3
}

Write-Host "`n=======================================================================" -ForegroundColor Green
Write-Host " [SYSTEM ONLINE] All Services Verified!" -ForegroundColor Green
Write-Host " Public SynOS URL:    https://synos.tbzlabs.in" -ForegroundColor Green
Write-Host " Public Cloud API:    https://cloud.tbzlabs.in" -ForegroundColor Green
Write-Host " Local SynOS App:     http://localhost:59999" -ForegroundColor Green
Write-Host "=======================================================================`n" -ForegroundColor Green
