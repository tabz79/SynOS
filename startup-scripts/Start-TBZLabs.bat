@echo off
REM Start-TBZLabs.bat
REM Companion launcher to run Start-TBZLabs.ps1 with bypassed execution policy

cd /d "D:\Projects\SynOS-Synthesized-Lab-Intelligence"
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\Projects\SynOS-Synthesized-Lab-Intelligence\startup-scripts\Start-TBZLabs.ps1"
exit
