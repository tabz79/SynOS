# Start-TBZLabs.ps1
# One-click startup script for SynOS and TBZ Middleware services

$emoji1 = [char]::ConvertFromUtf32(0x1F9EA) # 🧪
$emoji2 = [char]::ConvertFromUtf32(0x1F4BB) # 💻
$emoji3 = [char]::ConvertFromUtf32(0x2699)  # ⚙
$emoji4 = [char]::ConvertFromUtf32(0x1F4E6) # 📦
$emoji5 = [char]::ConvertFromUtf32(0x1F310) # 🌐
$emoji6 = [char]::ConvertFromUtf32(0x2601)  # ☁

$wtCommand = "wt " +
             "-d `"D:\Projects\SynOS-Synthesized-Lab-Intelligence`" --title `"$emoji1 SynOS API`" powershell -NoExit -Command `"Write-Host 'Running: dotnet run --project src\SynOS.Api\SynOS.Api.csproj --urls http://127.0.0.1:59999' -ForegroundColor Cyan \; dotnet run --project src\SynOS.Api\SynOS.Api.csproj --urls 'http://127.0.0.1:59999'`" `; " +
             "new-tab -d `"D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Frontend`" --title `"$emoji2 SynOS Frontend`" powershell -NoExit -Command `"Write-Host 'Running: npm run dev' -ForegroundColor Cyan \; npm run dev`" `; " +
             "new-tab -d `"D:\Projects\SynOS-Synthesized-Lab-Intelligence`" --title `"$emoji3 Middleware API`" powershell -NoExit -Command `"Write-Host 'Running: dotnet run --project TBZ.Middleware/src/TBZ.Middleware.Api/TBZ.Middleware.Api.csproj --urls http://localhost:5069' -ForegroundColor Cyan \; dotnet run --project TBZ.Middleware/src/TBZ.Middleware.Api/TBZ.Middleware.Api.csproj --urls 'http://localhost:5069'`" `; " +
             "new-tab -d `"D:\Projects\SynOS-Synthesized-Lab-Intelligence`" --title `"$emoji4 Middleware Workers`" powershell -NoExit -Command `"Write-Host 'Running: dotnet run --project TBZ.Middleware/src/TBZ.Middleware.Workers/TBZ.Middleware.Workers.csproj' -ForegroundColor Cyan \; dotnet run --project TBZ.Middleware/src/TBZ.Middleware.Workers/TBZ.Middleware.Workers.csproj`" `; " +
             "new-tab -d `"D:\Projects\SynOS-Synthesized-Lab-Intelligence\web`" --title `"$emoji5 Middleware Web`" powershell -NoExit -Command `"Write-Host 'Running: npm run dev' -ForegroundColor Cyan \; npm run dev`" `; " +
             "new-tab -d `"C:\Users\Asus\Downloads`" --title `"$emoji6 Cloudflare`" powershell -NoExit -Command `"Write-Host 'Running: .\cloudflared-windows-amd64.exe tunnel --url http://localhost:5069' -ForegroundColor Cyan \; .\cloudflared-windows-amd64.exe tunnel --url http://localhost:5069`""

Start-Process -FilePath "cmd.exe" -ArgumentList "/c $wtCommand" -WindowStyle Hidden
