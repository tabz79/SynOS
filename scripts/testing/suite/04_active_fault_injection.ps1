# SynOS Destruction & Stress Testing Suite
# Pillar 4: Active Destruction & Fault Injection (Kill Things While Working)
# Injects hard crashes, service kills, and DB outages during active workflows, then verifies consistency

param(
    [string]$BaseUrl = "http://localhost:59999",
    [string]$SqlInstance = ".\SYNOS",
    [string]$SqlDb = "SynOSDb-1"
)

$ErrorActionPreference = "Continue"

Write-Host "================================================================" -ForegroundColor Red
Write-Host " PILLAR 4: ACTIVE DESTRUCTION & HARD FAULT INJECTION" -ForegroundColor Red
Write-Host "================================================================" -ForegroundColor Red

$results = @{
    name = "Pillar 4: Active Destruction & Fault Injection"
    passed = $true
    faults = @()
    inconsistencies = @()
}

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

function Record-Fault([string]$faultName, [bool]$ok, [string]$details, [string]$severity = "P1-Critical") {
    $statusStr = if ($ok) { "PASS" } else { "FAIL" }
    $color = if ($ok) { "Green" } else { "Red" }
    Write-Host "[$statusStr] $faultName : $details" -ForegroundColor $color
    $results.faults += @{ fault = $faultName; passed = $ok; details = $details; severity = $severity }
    if (-not $ok) {
        $results.passed = $false
        $results.inconsistencies += "$faultName : $details"
    }
}

# Login Helper
function Get-AuthToken([string]$user, [string]$pass) {
    $payload = @{ username = $user; password = $pass } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 10
    return $res.token
}

$token = Get-AuthToken "reception" "Admin"

# ------------------------------------------------------------------------------
# FAULT 1: Forcibly Kill SynOS Windows Service Mid-Workflow & Measure Auto-Recovery
# ------------------------------------------------------------------------------
Write-Host "`n--- Fault 1: Forcibly Kill SynOS Process Mid-Workflow ---" -ForegroundColor Yellow

# Start a background asynchronous patient intake loop
$bgJob = Start-Job -ScriptBlock {
    param($url, $tok)
    for ($i = 1; $i -le 10; $i++) {
        $p = @{ mrn = "CRASH-$i-$(Get-Random)"; firstName = "Crash"; lastName = "Test$i"; gender = "Male"; dateOfBirth = "1990-01-01" } | ConvertTo-Json
        $idemKey = [System.Guid]::NewGuid().ToString()
        try {
            Invoke-RestMethod -Uri "$url/api/v1/patients" -Method Post -Body $p -ContentType "application/json" -Headers @{ Authorization = "Bearer $tok"; "Idempotency-Key" = $idemKey } -TimeoutSec 5
        } catch {}
        Start-Sleep -Milliseconds 200
    }
} -ArgumentList $BaseUrl, $token

Start-Sleep -Seconds 1

# Brutally kill SynOS.Api.exe
Write-Host "Terminating SynOS.Api.exe process with taskkill /F..." -ForegroundColor Magenta
taskkill.exe /F /IM "SynOS.Api.exe" /T 2>&1 | Out-Null

Stop-Job $bgJob -ErrorAction SilentlyContinue
Remove-Job $bgJob -ErrorAction SilentlyContinue

# Verify Windows Service auto-recovery or restart it
Start-Sleep -Seconds 3
$svc = Get-Service -Name "TBZSynOSService" -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -ne "Running") {
    Write-Host "Starting TBZSynOSService after crash..." -ForegroundColor Cyan
    Start-Service -Name "TBZSynOSService" -ErrorAction SilentlyContinue
}

# Wait for SynOS to resume accepting traffic
$recovered = $false
$sw = [System.Diagnostics.Stopwatch]::StartNew()
while ($sw.Elapsed.TotalSeconds -lt 25) {
    try {
        $health = Invoke-RestMethod -Uri "$BaseUrl/api/v1/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($health) { $recovered = $true; break }
    } catch {}
    Start-Sleep -Seconds 2
}

Record-Fault "ServiceRecoveryAfterCrash" $recovered "SynOS resumed responding after brutal process termination (Recovered in $($sw.Elapsed.TotalSeconds)s)."

# ------------------------------------------------------------------------------
# FAULT 2: Forcibly Stop SQL Server During Active Operations & Restart
# ------------------------------------------------------------------------------
Write-Host "`n--- Fault 2: Forcibly Stop MSSQL Server During Transaction ---" -ForegroundColor Yellow

# Stop SQL Server service
Write-Host "Stopping MSSQL service forcibly..." -ForegroundColor Magenta
Get-Service -Name "MSSQL*" | Stop-Service -Force -ErrorAction SilentlyContinue

# Attempt an API call while DB is down
$handledGracefully = $false
try {
    $p = @{ mrn = "DBDOWN-$(Get-Random)"; firstName = "Db"; lastName = "Down"; gender = "Male"; dateOfBirth = "1990-01-01" } | ConvertTo-Json
    $idemKey = [System.Guid]::NewGuid().ToString()
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients" -Method Post -Body $p -ContentType "application/json" -Headers @{ Authorization = "Bearer $token"; "Idempotency-Key" = $idemKey } -TimeoutSec 5
} catch {
    # It must throw 500 or 503, NOT crash the Kestrel host completely
    $handledGracefully = $true
}

# Restart SQL Server
Write-Host "Restarting MSSQL service..." -ForegroundColor Cyan
Get-Service -Name "MSSQL*" | Start-Service -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

# Check if SynOS API host stayed alive and re-established connection without reboot
$apiAlive = $false
try {
    $checkRes = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients" -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 10
    if ($checkRes) { $apiAlive = $true }
} catch {}

Record-Fault "DatabaseReconnectionResilience" $apiAlive "SynOS re-established connection pool after SQL Server outage without process restart."

# ------------------------------------------------------------------------------
# FAULT 3: Audit Database for Half-Created or Corrupted Data
# ------------------------------------------------------------------------------
Write-Host "`n--- Fault 3: Auditing Database Consistency & Atomicity ---" -ForegroundColor Yellow

$orphanedVisits = (Run-SqlScalar "SET NOCOUNT ON; SELECT COUNT(*) FROM Visits v LEFT JOIN Patients p ON v.PatientId = p.PatientId WHERE p.PatientId IS NULL").Trim()
$orphanedInvoices = (Run-SqlScalar "SET NOCOUNT ON; SELECT COUNT(*) FROM Invoices i LEFT JOIN Visits v ON i.VisitId = v.VisitId WHERE v.VisitId IS NULL").Trim()
$negativeInvoices = (Run-SqlScalar "SET NOCOUNT ON; SELECT COUNT(*) FROM Invoices WHERE Total < 0").Trim()

Write-Host "Database Audit Results:" -ForegroundColor Cyan
Write-Host "  Orphaned visits without patients: $orphanedVisits"
Write-Host "  Orphaned invoices without visits: $orphanedInvoices"
Write-Host "  Negative invoice totals:          $negativeInvoices"

$dbConsistent = ($orphanedVisits -eq "0") -and ($orphanedInvoices -eq "0") -and ($negativeInvoices -eq "0")
Record-Fault "DatabaseTransactionalIntegrity" $dbConsistent "No half-created or orphaned entities discovered after crash injection (OrphanVisits: $orphanedVisits, OrphanInvoices: $orphanedInvoices, NegInvoices: $negativeInvoices)."

$outputJson = Join-Path $PSScriptRoot "pillar4_results.json"
$results | ConvertTo-Json -Depth 4 | Set-Content -Path $outputJson -Force

Write-Host "`nPillar 4 Completed: $(if ($results.passed) { 'ALL DESTRUCTION FAULTS SURVIVED' } else { 'SYSTEM INCONSISTENCIES FOUND' })" -ForegroundColor $(if ($results.passed) { 'Green' } else { 'Red' })
if (-not $results.passed) { exit 1 } else { exit 0 }
