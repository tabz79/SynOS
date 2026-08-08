# scripts/build-pipeline.ps1
# Deterministic Build Pipeline for SynOS
# Steps:
# 1. Clean dist-build, wwwroot, publish directories
# 2. Rebuild frontend via Vite
# 3. Copy dist-build to SynOS.Api/wwwroot
# 4. Publish backend (dotnet publish)
# 5. Verify published index.html JS bundle hash exists exactly once in publish/wwwroot/assets

$ErrorActionPreference = "Stop"

$rootDir = "d:\Projects\SynOS-Synthesized-Lab-Intelligence"
$frontendDir = "$rootDir\src\SynOS.Frontend"
$distBuildDir = "$frontendDir\dist-build"
$apiWwwrootDir = "$rootDir\src\SynOS.Api\wwwroot"
$publishDir = "$rootDir\src\SynOS.Api\bin\Release\net8.0\win-x64\publish"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " [SynOS Deterministic Build Pipeline] Starting..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# STEP 1: CLEANING STALE BUILD ARTIFACTS
Write-Host "`n[1/5] Cleaning stale directories..." -ForegroundColor Yellow

if (Test-Path $distBuildDir) {
    Write-Host "  - Removing $distBuildDir"
    Remove-Item -Path $distBuildDir -Recurse -Force
}

if (Test-Path $apiWwwrootDir) {
    Write-Host "  - Removing $apiWwwrootDir"
    Remove-Item -Path $apiWwwrootDir -Recurse -Force
}

if (Test-Path $publishDir) {
    Write-Host "  - Removing $publishDir"
    Remove-Item -Path $publishDir -Recurse -Force
}

Write-Host "  -> Clean complete." -ForegroundColor Green

# STEP 2: REBUILD FRONTEND
Write-Host "`n[2/5] Rebuilding frontend (npm run build)..." -ForegroundColor Yellow
Set-Location -Path $frontendDir
& npx vite build
if ($LASTEXITCODE -ne 0) {
    Throw "Vite build failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path $distBuildDir)) {
    Throw "Frontend build directory $distBuildDir was not created!"
}
Write-Host "  -> Frontend build successful." -ForegroundColor Green

# STEP 3: COPY TO WWWROOT
Write-Host "`n[3/5] Copying dist-build to src/SynOS.Api/wwwroot..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $apiWwwrootDir | Out-Null
Copy-Item -Path "$distBuildDir\*" -Destination $apiWwwrootDir -Recurse -Force
Write-Host "  -> Copy to wwwroot complete." -ForegroundColor Green

# STEP 4: PUBLISH BACKEND
Write-Host "`n[4/5] Publishing backend (dotnet publish)..." -ForegroundColor Yellow
Set-Location -Path $rootDir
& dotnet publish src/SynOS.Api/SynOS.Api.csproj -c Release -r win-x64 --self-contained true
if ($LASTEXITCODE -ne 0) {
    Throw "dotnet publish failed with exit code $LASTEXITCODE"
}
Write-Host "  -> Backend publish successful." -ForegroundColor Green

# STEP 5: VERIFICATION OF PUBLISHED ASSET HASH
Write-Host "`n[5/5] Verifying publish integrity..." -ForegroundColor Yellow

$publishedIndexHtml = "$publishDir\wwwroot\index.html"
$publishedAssetsDir = "$publishDir\wwwroot\assets"

if (-not (Test-Path $publishedIndexHtml)) {
    Throw "Verification Failed: $publishedIndexHtml does not exist!"
}

if (-not (Test-Path $publishedAssetsDir)) {
    Throw "Verification Failed: $publishedAssetsDir does not exist!"
}

$indexContent = Get-Content -Path $publishedIndexHtml -Raw
$regex = '/assets/(index-[A-Za-z0-9_\-]+\.js)'
if ($indexContent -match $regex) {
    $jsFilename = $Matches[1]
    Write-Host "  - Referenced JS bundle in index.html: $jsFilename" -ForegroundColor Cyan
    
    $jsFilePath = "$publishedAssetsDir\$jsFilename"
    if (-not (Test-Path $jsFilePath)) {
        Throw "VERIFICATION ERROR: Referenced bundle '$jsFilename' does NOT exist in '$publishedAssetsDir'!"
    }
    
    $allJsBundles = Get-ChildItem -Path $publishedAssetsDir -Filter "index-*.js"
    Write-Host "  - Total index-*.js files in publish assets: $($allJsBundles.Count)"
    
    if ($allJsBundles.Count -ne 1) {
        Throw "VERIFICATION ERROR: Expected exactly 1 index-*.js bundle in publish assets, but found $($allJsBundles.Count)!"
    }
    
    $jsSize = (Get-Item $jsFilePath).Length
    Write-Host "  - File Size of ${jsFilename}: $jsSize bytes"
    Write-Host "`n==================================================" -ForegroundColor Green
    Write-Host " [BUILD PIPELINE SUCCESS] All checks passed!" -ForegroundColor Green
    Write-Host " Hash '${jsFilename}' exists exactly once in publish/wwwroot/assets." -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
} else {
    Throw "VERIFICATION ERROR: Could not extract index-*.js asset reference from $publishedIndexHtml!"
}
