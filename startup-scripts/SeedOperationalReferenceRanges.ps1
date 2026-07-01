# SeedOperationalReferenceRanges.ps1
# Script to map HAEMOGRAM parameters to their ParameterId values and seed operational ReferenceRanges

$data = @(
    @{
        Code = "HAEMOGLOBIN"
        Default = "13.0-18.0"
        AdultM = "13.0-18.0"; AdultF = "11.5-16.5"
        ChildM = "11.5-14.5"; ChildF = "11.5-14.5"
        InfantM = "13.5-19.5"; InfantF = "13.5-19.5"
        NewbornM = "13.5-19.5"; NewbornF = "13.5-19.5"
    },
    @{
        Code = "RED_CELL_COUNT"
        Default = "4.5-6.5"
        AdultM = "4.5-6.5"; AdultF = "3.8-5.8"
        ChildM = "4.0-5.4"; ChildF = "4.0-5.4"
        InfantM = "4.0-6.0"; InfantF = "4.0-6.0"
        NewbornM = "4.0-6.0"; NewbornF = "4.0-6.0"
    },
    @{
        Code = "PACKED_CELL_VOLUME"
        Default = "40.0-54.0"
        AdultM = "40.0-54.0"; AdultF = "37.0-47.0"
        ChildM = "37.0-45.0"; ChildF = "37.0-45.0"
        InfantM = "44.0-64.0"; InfantF = "44.0-64.0"
        NewbornM = "44.0-64.0"; NewbornF = "44.0-64.0"
    },
    @{
        Code = "MEAN_CORP_VOL"
        Default = "76-96"
        AdultM = "76-96"; AdultF = "76-96"
        ChildM = "77-91"; ChildF = "77-91"
        InfantM = "84-106"; InfantF = "84-106"
        NewbornM = "84-106"; NewbornF = "84-106"
    },
    @{
        Code = "MEAN_CORP_HEM"
        Default = "27-32"
        AdultM = "27-32"; AdultF = "27-32"
        ChildM = "24-30"; ChildF = "24-30"
        InfantM = "24-30"; InfantF = "24-30"
        NewbornM = "24-30"; NewbornF = "24-30"
    },
    @{
        Code = "MEAN_CORP_HEM_CONC"
        Default = "30-35"
        AdultM = "30-35"; AdultF = "30-35"
        ChildM = "30-35"; ChildF = "30-35"
        InfantM = "30-35"; InfantF = "30-35"
        NewbornM = "30-35"; NewbornF = "30-35"
    },
    @{
        Code = "PLATELET_COUNT"
        Default = "150000-400000"
        AdultM = "150000-400000"; AdultF = "150000-400000"
        ChildM = "150000-400000"; ChildF = "150000-400000"
        InfantM = "150000-400000"; InfantF = "150000-400000"
        NewbornM = "150000-400000"; NewbornF = "150000-400000"
    },
    @{
        Code = "TOTAL_WBC_COUNT"
        Default = "4000-11000"
        AdultM = "4000-11000"; AdultF = "4000-11000"
        ChildM = "4500-13500"; ChildF = "4500-13500"
        InfantM = "6000-18000"; InfantF = "6000-18000"
        NewbornM = "6000-18000"; NewbornF = "6000-18000"
    },
    @{
        Code = "NEUTROPHILS"
        Default = "40-75"
        AdultM = "40-75"; AdultF = "40-75"
        ChildM = "40-60"; ChildF = "40-60"
        InfantM = "30-70"; InfantF = "30-70"
        NewbornM = "30-70"; NewbornF = "30-70"
    },
    @{
        Code = "LYMPHOCYTES"
        Default = "20-45"
        AdultM = "20-45"; AdultF = "20-45"
        ChildM = "45-65"; ChildF = "45-65"
        InfantM = "25-55"; InfantF = "25-55"
        NewbornM = "25-55"; NewbornF = "25-55"
    },
    @{
        Code = "MONOCYTES"
        Default = "2-10"
        AdultM = "2-10"; AdultF = "2-10"
        ChildM = "2-12"; ChildF = "2-12"
        InfantM = "3-12"; InfantF = "3-12"
        NewbornM = "3-12"; NewbornF = "3-12"
    },
    @{
        Code = "EOSINOPHILS"
        Default = "1-6"
        AdultM = "1-6"; AdultF = "1-6"
        ChildM = "2-8"; ChildF = "2-8"
        InfantM = "2-10"; InfantF = "2-10"
        NewbornM = "2-10"; NewbornF = "2-10"
    },
    @{
        Code = "BASOPHILS"
        Default = "0-1"
        AdultM = "0-1"; AdultF = "0-1"
        ChildM = "0-1"; ChildF = "0-1"
        InfantM = "0-1"; InfantF = "0-1"
        NewbornM = "0-1"; NewbornF = "0-1"
    }
)

Write-Host "Fetching Parameter IDs..."
# Define helper to execute query and get CSV
function Get-SqlData($query) {
    $tempFile = [System.IO.Path]::GetTempFileName()
    sqlcmd -S "(localdb)\MSSQLLocalDB" -d "SynOSDb" -Q $query -s "," -W -h -1 > $tempFile
    $lines = Get-Content $tempFile | Where-Object { $_ -match "," }
    Remove-Item $tempFile -Force
    return $lines
}

# Fetch parameter list
$paramLines = Get-SqlData "SELECT ParameterId, ParameterCode FROM Parameters WHERE TestId IN (SELECT TestId FROM Tests WHERE TestCode = 'HAEMOGRAM');"
$paramMap = @{}
foreach ($line in $paramLines) {
    $id, $code = $line.Split(',')
    $paramMap[$code.Trim()] = $id.Trim()
}

if ($paramMap.Count -eq 0) {
    Write-Error "Failed to fetch parameter mapping from operational DB!"
    exit 1
}

# Generate SQL script
$sql = ""
$paramIds = $paramMap.Values | ForEach-Object { "'$_'" }
$paramListStr = $paramIds -join ","
$sql += "DELETE FROM ReferenceRanges WHERE ParameterId IN ($paramListStr);`n"

foreach ($row in $data) {
    $code = $row.Code
    $parameterId = $paramMap[$code]
    if (-not $parameterId) {
        Write-Warning "No operational ParameterId found for $code"
        continue
    }

    # Helper to check if string contains range or single value
    $low = "NULL"
    $high = "NULL"
    
    # 1. Default (ALL, NULL, NULL)
    if ($row.Default -match "^(\d+(\.\d+)?)-(\d+(\.\d+)?)$") {
        $low = $Matches[1]
        $high = $Matches[3]
    }
    $id = [Guid]::NewGuid().ToString()
    $sql += "INSERT INTO ReferenceRanges (ReferenceRangeId, ParameterId, AgeGroup, AgeMin, AgeMax, Sex, RefLow, RefHigh, EffectiveFrom, IsActive, CreatedAt, UpdatedAt) VALUES ('$id', '$parameterId', 'ALL', NULL, NULL, 'ALL', $low, $high, GETDATE(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());`n"

    # 2. Adult M (MALE, 12, 120)
    if ($row.AdultM -match "^(\d+(\.\d+)?)-(\d+(\.\d+)?)$") {
        $low = $Matches[1]
        $high = $Matches[3]
    }
    $id = [Guid]::NewGuid().ToString()
    $sql += "INSERT INTO ReferenceRanges (ReferenceRangeId, ParameterId, AgeGroup, AgeMin, AgeMax, Sex, RefLow, RefHigh, EffectiveFrom, IsActive, CreatedAt, UpdatedAt) VALUES ('$id', '$parameterId', 'Adult', 12, 120, 'Male', $low, $high, GETDATE(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());`n"

    # 3. Adult F (FEMALE, 12, 120)
    if ($row.AdultF -match "^(\d+(\.\d+)?)-(\d+(\.\d+)?)$") {
        $low = $Matches[1]
        $high = $Matches[3]
    }
    $id = [Guid]::NewGuid().ToString()
    $sql += "INSERT INTO ReferenceRanges (ReferenceRangeId, ParameterId, AgeGroup, AgeMin, AgeMax, Sex, RefLow, RefHigh, EffectiveFrom, IsActive, CreatedAt, UpdatedAt) VALUES ('$id', '$parameterId', 'Adult', 12, 120, 'Female', $low, $high, GETDATE(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());`n"

    # 4. Child M (MALE, 1, 12)
    if ($row.ChildM -match "^(\d+(\.\d+)?)-(\d+(\.\d+)?)$") {
        $low = $Matches[1]
        $high = $Matches[3]
    }
    $id = [Guid]::NewGuid().ToString()
    $sql += "INSERT INTO ReferenceRanges (ReferenceRangeId, ParameterId, AgeGroup, AgeMin, AgeMax, Sex, RefLow, RefHigh, EffectiveFrom, IsActive, CreatedAt, UpdatedAt) VALUES ('$id', '$parameterId', 'Child', 1, 12, 'Male', $low, $high, GETDATE(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());`n"

    # 5. Child F (FEMALE, 1, 12)
    if ($row.ChildF -match "^(\d+(\.\d+)?)-(\d+(\.\d+)?)$") {
        $low = $Matches[1]
        $high = $Matches[3]
    }
    $id = [Guid]::NewGuid().ToString()
    $sql += "INSERT INTO ReferenceRanges (ReferenceRangeId, ParameterId, AgeGroup, AgeMin, AgeMax, Sex, RefLow, RefHigh, EffectiveFrom, IsActive, CreatedAt, UpdatedAt) VALUES ('$id', '$parameterId', 'Child', 1, 12, 'Female', $low, $high, GETDATE(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());`n"

    # 6. Infant M (MALE, 0, 1)
    if ($row.InfantM -match "^(\d+(\.\d+)?)-(\d+(\.\d+)?)$") {
        $low = $Matches[1]
        $high = $Matches[3]
    }
    $id = [Guid]::NewGuid().ToString()
    $sql += "INSERT INTO ReferenceRanges (ReferenceRangeId, ParameterId, AgeGroup, AgeMin, AgeMax, Sex, RefLow, RefHigh, EffectiveFrom, IsActive, CreatedAt, UpdatedAt) VALUES ('$id', '$parameterId', 'Infant', 0, 1, 'Male', $low, $high, GETDATE(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());`n"

    # 7. Infant F (FEMALE, 0, 1)
    if ($row.InfantF -match "^(\d+(\.\d+)?)-(\d+(\.\d+)?)$") {
        $low = $Matches[1]
        $high = $Matches[3]
    }
    $id = [Guid]::NewGuid().ToString()
    $sql += "INSERT INTO ReferenceRanges (ReferenceRangeId, ParameterId, AgeGroup, AgeMin, AgeMax, Sex, RefLow, RefHigh, EffectiveFrom, IsActive, CreatedAt, UpdatedAt) VALUES ('$id', '$parameterId', 'Infant', 0, 1, 'Female', $low, $high, GETDATE(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());`n"

    # 8. Newborn M (MALE, 0, 0)
    if ($row.NewbornM -match "^(\d+(\.\d+)?)-(\d+(\.\d+)?)$") {
        $low = $Matches[1]
        $high = $Matches[3]
    }
    $id = [Guid]::NewGuid().ToString()
    $sql += "INSERT INTO ReferenceRanges (ReferenceRangeId, ParameterId, AgeGroup, AgeMin, AgeMax, Sex, RefLow, RefHigh, EffectiveFrom, IsActive, CreatedAt, UpdatedAt) VALUES ('$id', '$parameterId', 'Newborn', 0, 0, 'Male', $low, $high, GETDATE(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());`n"

    # 9. Newborn F (FEMALE, 0, 0)
    if ($row.NewbornF -match "^(\d+(\.\d+)?)-(\d+(\.\d+)?)$") {
        $low = $Matches[1]
        $high = $Matches[3]
    }
    $id = [Guid]::NewGuid().ToString()
    $sql += "INSERT INTO ReferenceRanges (ReferenceRangeId, ParameterId, AgeGroup, AgeMin, AgeMax, Sex, RefLow, RefHigh, EffectiveFrom, IsActive, CreatedAt, UpdatedAt) VALUES ('$id', '$parameterId', 'Newborn', 0, 0, 'Female', $low, $high, GETDATE(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());`n"
}

# Write SQL file
$sqlPath = Join-Path $PSScriptRoot "SeedOperationalRanges.sql"
Set-Content -Path $sqlPath -Value $sql -Encoding UTF8
Write-Host "Generated SQL script at: $sqlPath"

# Execute SQL command
sqlcmd -S "(localdb)\MSSQLLocalDB" -d "SynOSDb" -i $sqlPath
Remove-Item $sqlPath -Force
Write-Host "Operational ReferenceRanges successfully updated in DB."
