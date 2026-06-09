$response = Invoke-RestMethod -Uri "http://127.0.0.1:59999/dev-login?roles=Admin" -Method Post
$token = $response.token
$headers = @{ Authorization = "Bearer $token" }
$dashboard = Invoke-RestMethod -Uri "http://127.0.0.1:59999/api/v1/inventory/dashboard?isConsolidated=true" -Method Get -Headers $headers
$dashboard | ConvertTo-Json

$stock = Invoke-RestMethod -Uri "http://127.0.0.1:59999/api/v1/inventory/stock?isConsolidated=true" -Method Get -Headers $headers
$stock | ConvertTo-Json
