$appPath = 'C:\Program Files\TBZ Labs\SynOS\appsettings.json'
$json = Get-Content $appPath -Raw | ConvertFrom-Json
$json.ConnectionStrings.DefaultConnection = 'Data Source=.\SYNOS;Initial Catalog=SynOSDb-1;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=True;Trust Server Certificate=True'
$json | ConvertTo-Json -Depth 10 | Set-Content -Path $appPath

$statePath = 'C:\ProgramData\TBZ Labs\SynOS\Config\setup_state.json'
if (Test-Path $statePath) {
    $state = Get-Content $statePath -Raw | ConvertFrom-Json
    $state.DatabaseName = 'SynOSDb-1'
    $state | ConvertTo-Json | Set-Content -Path $statePath
}

Restart-Service TBZSynOSService
Get-Service TBZSynOSService
