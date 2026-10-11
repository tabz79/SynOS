@echo off
title TBZ Labs - Cloud and Infrastructure Launcher
color 0B

if "%1"=="--silent" goto START_SERVICES
if "%1"=="/silent" goto START_SERVICES

cls
echo =======================================================================
echo          TBZ LABS - CLOUD INFRASTRUCTURE AND TUNNEL LAUNCHER
echo =======================================================================
echo.
echo  Cloud API:   https://cloud.tbzlabs.in [Port 5069]
echo  SynOS App:   https://synos.tbzlabs.in [Port 59999]
echo.
echo =======================================================================
echo.

:START_SERVICES
:: 1. Verify SynOS Windows Service
echo [*] Checking SynOS Windows Service TBZSynOSService...
sc query TBZSynOSService | findstr RUNNING >nul
if %errorlevel% equ 0 goto SERVICE_OK
echo [!] Starting SynOS Service...
net start TBZSynOSService >nul 2>&1
ping 127.0.0.1 -n 3 >nul
:SERVICE_OK
echo [OK] SynOS Service is RUNNING on port 59999.

:: 2. Check and Start TBZ Middleware API
echo [*] Checking TBZ Middleware API on port 5069...
netstat -ano | findstr /R ":5069.*LISTENING" >nul
if %errorlevel% equ 0 goto API_OK
echo [*] Launching TBZ Middleware API on port 5069...
start "TBZ_Middleware_API" /min cmd /c "cd /d D:\Projects\SynOS-Synthesized-Lab-Intelligence\TBZ.Middleware\src\TBZ.Middleware.Api && dotnet run --launch-profile http"
ping 127.0.0.1 -n 5 >nul
:API_OK
echo [OK] TBZ Middleware API is RUNNING on port 5069.

:: 3. Check and Start Cloudflare Tunnel
echo [*] Checking Cloudflare Tunnel tbz-cloud...
tasklist | findstr /I "cloudflared.exe" >nul
if %errorlevel% equ 0 goto TUNNEL_OK
echo [*] Launching Cloudflare Tunnel...
start "Cloudflare_Tunnel" /min "C:\Users\Asus\cloudflared.exe" tunnel --protocol http2 --config "C:\Users\Asus\.cloudflared\config.yml" run
ping 127.0.0.1 -n 4 >nul
:TUNNEL_OK
echo [OK] Cloudflare Tunnel is RUNNING.

if "%1"=="--silent" exit /b 0
if "%1"=="/silent" exit /b 0

echo.
echo =======================================================================
echo  [SYSTEM ONLINE] All Services Verified!
echo.
echo  Public SynOS URL:    https://synos.tbzlabs.in
echo  Public Cloud API:    https://cloud.tbzlabs.in
echo  Local SynOS App:     http://localhost:59999
echo =======================================================================
echo.
echo Keep the launched terminal windows open in the background.
echo Press any key to close this launcher window...
pause >nul
