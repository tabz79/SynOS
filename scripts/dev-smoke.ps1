# SynOS Development Smoke Test
# This script tests the dev-login and a protected endpoint.
# HOW TO RUN:
# 1. Ensure the SynOS.Api is running on the specified URL.
# 2. Open PowerShell and navigate to this 'scripts' directory.
# 3. Run: ./dev-smoke.ps1

# --- Configuration ---
$baseUrl = "http://localhost:5002" # Match the URL you run the API with
# A known VisitId from your test database.
# You might need to query your DB to get a valid one after running migrations.
$testVisitId = "11111111-2222-3333-4444-555555555555" 

# --- Script Body ---
Write-Host "--- SynOS Smoke Test ---" -ForegroundColor Yellow

# 1. Get a developer JWT token
Write-Host "Step 1: Requesting developer JWT from /dev-login..."
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/dev-login" -Method Post
    $jwt = $loginResponse.token
    if ($jwt) {
        Write-Host "Successfully obtained JWT." -ForegroundColor Green
    } else {
        throw "Token was empty."
    }
}
catch {
    Write-Host "Failed to get JWT. Error: $_" -ForegroundColor Red
    exit 1
}

# 2. Use the token to call a protected endpoint
Write-Host "Step 2: Calling POST /api/v1/samples/create-for-visit..."
try {
    $headers = @{
        "Authorization" = "Bearer $jwt"
        "Content-Type"  = "application/json"
    }
    $body = @{
        "visitId" = $testVisitId
    } | ConvertTo-Json

    $sampleResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/samples/create-for-visit" -Method Post -Headers $headers -Body $body
    
    Write-Host "Successfully called protected endpoint. Response:" -ForegroundColor Green
    $sampleResponse | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "Failed to call protected endpoint. Status: $($_.Exception.Response.StatusCode.value__), Body: $($_.Exception.Response.Content)" -ForegroundColor Red
    exit 1
}

Write-Host "--- Smoke Test Passed! ---" -ForegroundColor Green
