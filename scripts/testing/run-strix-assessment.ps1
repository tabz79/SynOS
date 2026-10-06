<#
.SYNOPSIS
    Repeatable Local Strix Security Assessment Runner for SynOS.
.DESCRIPTION
    Validates environment readiness and executes Strix security testing strictly
    against the local SynOS development/staging instance.
    Adheres strictly to local scoping and non-destructive boundaries.
#>

[CmdletBinding()]
param(
    [ValidateSet("quick", "standard", "deep")]
    [string]$ScanMode = "standard",

    [double]$MaxBudget = 10.0,

    [string]$TargetUrl = "http://localhost:59999/swagger/v1/swagger.json"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " SynOS Local Security Assessment via Strix" -ForegroundColor Cyan
Write-Host " Target: $TargetUrl" -ForegroundColor Cyan
Write-Host " Branch: testing (Local Isolated Staging)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Enforce Target Safety Assertion
if (-not ($TargetUrl.StartsWith("http://localhost:59999/") -or $TargetUrl.StartsWith("http://127.0.0.1:59999/"))) {
    Write-Error "Safety violation: Target '$TargetUrl' is not a local SynOS endpoint. Testing external URLs is strictly forbidden."
    exit 1
}

# 2. Verify Git Branch
$currentBranch = (git branch --show-current).Trim()
if ($currentBranch -ne "testing") {
    Write-Error "Safety violation: Current Git branch is '$currentBranch'. Testing must only run on 'testing' branch."
    exit 1
}

# 3. Verify Local SynOS Instance Availability
Write-Host "[1/5] Checking local SynOS instance on port 59999..." -ForegroundColor Yellow
$connection = Test-NetConnection -ComputerName "localhost" -Port 59999 -WarningAction SilentlyContinue
if (-not $connection.TcpTestSucceeded) {
    Write-Warning "Local SynOS API is not responding on port 59999."
    Write-Host "Please start the local instance before testing:" -ForegroundColor Yellow
    Write-Host "  Option A: Start-Service TBZSynOSService" -ForegroundColor Gray
    Write-Host "  Option B: dotnet run --project src/SynOS.Api" -ForegroundColor Gray
    exit 1
}
Write-Host "      Local SynOS API is listening and reachable." -ForegroundColor Green

# 4. Verify Docker Daemon Readiness (Required by Strix)
Write-Host "[2/5] Checking Docker daemon status..." -ForegroundColor Yellow
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
    Write-Warning "Docker CLI is not found in PATH. Strix requires Docker to run its dynamic sandbox container."
    Write-Host "Please install and start Docker Desktop before running Strix." -ForegroundColor Yellow
    exit 1
}
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Docker daemon is not running. Please start Docker Desktop."
        exit 1
    }
} catch {
    Write-Warning "Failed to query Docker daemon. Please ensure Docker Desktop is running."
    exit 1
}
Write-Host "      Docker daemon is active." -ForegroundColor Green

# 5. Verify Strix Executable
Write-Host "[3/5] Checking Strix executable..." -ForegroundColor Yellow
$userScriptsPath = Join-Path $env:APPDATA "Python\Python313\Scripts"
if (Test-Path (Join-Path $userScriptsPath "strix.exe") -and -not ($env:PATH -split ';' -contains $userScriptsPath)) {
    $env:PATH = "$userScriptsPath;$env:PATH"
}
$strixCmd = Get-Command strix -ErrorAction SilentlyContinue
if (-not $strixCmd) {
    Write-Warning "Strix CLI ('strix') is not found in PATH."
    Write-Host "To install Strix, run:" -ForegroundColor Yellow
    Write-Host "  pip install strix-agent" -ForegroundColor Gray
    Write-Host "  (or: pipx install strix-agent)" -ForegroundColor Gray
    exit 1
}
Write-Host "      Strix executable found at $($strixCmd.Source)." -ForegroundColor Green

# 6. Verify LLM Provider Configuration
Write-Host "[4/5] Checking LLM provider configuration..." -ForegroundColor Yellow
if (-not $env:STRIX_LLM -or -not $env:LLM_API_KEY) {
    Write-Warning "LLM environment variables not set."
    Write-Host "Please configure your LLM provider before launching:" -ForegroundColor Yellow
    Write-Host "  `$env:STRIX_LLM = 'anthropic/claude-3-5-sonnet-latest' (or openai/gpt-4o)" -ForegroundColor Gray
    Write-Host "  `$env:LLM_API_KEY = 'your-key-here'" -ForegroundColor Gray
    exit 1
}
Write-Host "      LLM configuration detected (STRIX_LLM: $env:STRIX_LLM)." -ForegroundColor Green

# 7. Execute Strix Security Assessment
Write-Host "[5/5] Launching Strix Security Assessment..." -ForegroundColor Yellow
$instructionFile = Join-Path $PSScriptRoot "assessment-scope-instruction.txt"

$strixArgs = @(
    "-n",
    "-t", $TargetUrl,
    "--scan-mode", $ScanMode,
    "--max-budget", "$MaxBudget"
)

if (Test-Path $instructionFile) {
    $strixArgs += @("--instruction-file", $instructionFile)
}

Write-Host "Executing command: strix $($strixArgs -join ' ')" -ForegroundColor Cyan
& strix @strixArgs

Write-Host "To view assessment report in dashboard, run: strix view ." -ForegroundColor Green
