$headers = @{"Content-Type" = "application/json"}
$body = @{Username = "admin"; Password = "admin123"} | ConvertTo-Json
try {
    $res = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:59999/api/v1/auth/login" -Body $body -Headers $headers
    $token = $res.accessToken
    Write-Output "Successfully logged in. Token: $token"
    
    $authHeaders = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    $templates = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:59999/api/v1/reports/templates" -Headers $authHeaders
    Write-Output "Templates retrieved successfully:"
    $templates | ConvertTo-Json
} catch {
    Write-Error $_.Exception.Message
}
