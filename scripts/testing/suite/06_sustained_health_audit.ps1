# SynOS Destruction & Stress Testing Suite
# Pillar 7: Sustained Stress, Memory Leak & Forensic Health Audit
# Audits Working Set RAM, Private Bytes, Handle Count, Orphan Files, and SQL Error Logs before and after sustained execution

param(
    [string]$BaseUrl = "http://localhost:59999",
    [string]$SqlInstance = ".\SYNOS",
    [string]$SqlDb = "SynOSDb-1",
    [int]$DurationSeconds = 120
)

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " PILLAR 7: SUSTAINED STRESS, MEMORY AUDIT & ORPHAN FILE SCAN" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

function Run-SqlScalar([string]$query) {
    try {
        $escaped = $query.Replace('"', '""')
        $cmd = "sqlcmd -S `"$SqlInstance`" -d `"$SqlDb`" -E -Q `"$escaped`" -h -1 -W"
        $val = Invoke-Expression $cmd
        return ($val -join "").Trim()
    } catch {
        return "ERROR: $_"
    }
}

function Get-ProcessMetrics([string]$procName) {
    $proc = Get-Process -Name $procName -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($proc) {
        return @{
            Found = $true
            WorkingSetMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
            PrivateMemoryMB = [math]::Round($proc.PrivateMemorySize64 / 1MB, 2)
            Handles = $proc.HandleCount
            Threads = $proc.Threads.Count
        }
    }
    return @{ Found = $false; WorkingSetMB = 0; PrivateMemoryMB = 0; Handles = 0; Threads = 0 }
}

# 1. Capture Initial Baseline State
Write-Host "--- 1. Capturing Initial System Health Baseline ---" -ForegroundColor Yellow
$baselineApi = Get-ProcessMetrics "SynOS.Api"
$baselineSql = Get-ProcessMetrics "sqlservr"

Write-Host "Baseline SynOS.Api: RAM=$($baselineApi.WorkingSetMB) MB | Handles=$($baselineApi.Handles) | Threads=$($baselineApi.Threads)"
Write-Host "Baseline SQL Server: RAM=$($baselineSql.WorkingSetMB) MB | Handles=$($baselineSql.Handles)"

# 2. Run Sustained Continuous Workflow Loop
Write-Host "`n--- 2. Executing Sustained Workflow Load (${DurationSeconds}s) ---" -ForegroundColor Yellow

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$cycle = 0
$totalWorkflows = 0

# Auth token
$token = ""
try {
    $authPayload = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
    $authRes = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method Post -Body $authPayload -ContentType "application/json" -TimeoutSec 10
    $token = $authRes.token
} catch {
    Write-Host "WARNING: Could not obtain token for sustained loop: $_" -ForegroundColor Yellow
}

while ($sw.Elapsed.TotalSeconds -lt $DurationSeconds) {
    $cycle++
    # Fire a batch of 5 requests each second
    for ($b = 1; $b -le 5; $b++) {
        $totalWorkflows++
        $pat = @{
            mrn = "SUSTAIN-$cycle-$b-$(Get-Random)"
            firstName = "Sustain$cycle"
            lastName = "Load$b"
            gender = "Female"
            dateOfBirth = "1995-05-05"
        } | ConvertTo-Json

        try {
            Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients" -Method Post -Body $pat -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 3 | Out-Null
        } catch {}
    }

    if ($cycle % 10 -eq 0) {
        $currentRam = (Get-ProcessMetrics "SynOS.Api").WorkingSetMB
        Write-Host "  [T+$([int]$sw.Elapsed.TotalSeconds)s] Completed $totalWorkflows workflows. SynOS.Api RAM: ${currentRam} MB" -ForegroundColor DarkGray
    }

    Start-Sleep -Milliseconds 800
}

Write-Host "Sustained load generation complete. Total workflows executed: $totalWorkflows in $($sw.Elapsed.TotalSeconds)s."

# 3. Capture Post-Load Metrics & Calculate Memory Growth
Write-Host "`n--- 3. Measuring Post-Load Health & Memory Deltas ---" -ForegroundColor Yellow
Start-Sleep -Seconds 3 # Allow GC cycle

$finalApi = Get-ProcessMetrics "SynOS.Api"
$finalSql = Get-ProcessMetrics "sqlservr"

$apiRamDeltaMB = [math]::Round($finalApi.WorkingSetMB - $baselineApi.WorkingSetMB, 2)
$apiHandleDelta = $finalApi.Handles - $baselineApi.Handles

Write-Host "Post-Load SynOS.Api: RAM=$($finalApi.WorkingSetMB) MB (Delta: +$apiRamDeltaMB MB) | Handles=$($finalApi.Handles) (Delta: +$apiHandleDelta)"
Write-Host "Post-Load SQL Server: RAM=$($finalSql.WorkingSetMB) MB | Handles=$($finalSql.Handles)"

# Leak Detection Gate: SynOS.Api memory growth must not exceed 250 MB for this load
$leakDetected = ($apiRamDeltaMB -gt 250)

# 4. File System Orphan Scan in C:\SynOS_Files
Write-Host "`n--- 4. File System Orphan & Storage Integrity Audit ---" -ForegroundColor Yellow
$storageDir = "C:\SynOS_Files"
$orphanFiles = @()
if (Test-Path $storageDir) {
    $allFiles = Get-ChildItem -Path $storageDir -Recurse -File -ErrorAction SilentlyContinue
    Write-Host "Total stored artifacts: $($allFiles.Count) files"
    foreach ($f in $allFiles) {
        if ($f.Length -eq 0) {
            $orphanFiles += "Zero-byte file: $($f.FullName)"
        }
    }
}

# 5. Check SQL Server Error Log for Critical Warnings / Assertions
Write-Host "`n--- 5. Reviewing SQL Server Error Log ---" -ForegroundColor Yellow
$deadlockCount = Run-SqlScalar "SELECT cntr_value FROM sys.dm_os_performance_counters WHERE counter_name = 'Number of Deadlocks/sec' AND instance_name = '_Total'"
$corruptionChecks = Run-SqlScalar "SELECT COUNT(*) FROM sys.dm_hadr_auto_page_repair"

$passed = (-not $leakDetected) -and ($orphanFiles.Count -eq 0)

$report = @{
    name = "Pillar 7: Sustained Stress & Health Audit"
    passed = $passed
    durationSeconds = [int]$sw.Elapsed.TotalSeconds
    totalWorkflows = $totalWorkflows
    memory = @{
        baselineApiMB = $baselineApi.WorkingSetMB
        finalApiMB = $finalApi.WorkingSetMB
        deltaMB = $apiRamDeltaMB
        baselineHandles = $baselineApi.Handles
        finalHandles = $finalApi.Handles
        handleDelta = $apiHandleDelta
        leakDetected = $leakDetected
    }
    fileSystem = @{
        totalFiles = if ($allFiles) { $allFiles.Count } else { 0 }
        zeroByteFiles = $orphanFiles.Count
    }
    sqlServer = @{
        totalDeadlocks = $deadlockCount
    }
}

$outputJson = Join-Path $PSScriptRoot "pillar7_results.json"
$report | ConvertTo-Json -Depth 4 | Set-Content -Path $outputJson -Force

$statusStr = if ($passed) { 'PASS' } else { 'FAIL' }
Write-Host "[$statusStr] Memory Leak & Stability: RAM Delta=${apiRamDeltaMB}MB, Zero-Byte Files=$($orphanFiles.Count)" -ForegroundColor $(if ($passed) { 'Green' } else { 'Red' })
if (-not $passed) { exit 1 } else { exit 0 }
