# SeedLFTOperationalRanges.ps1
# Script to delete and insert LFT parameter reference ranges into both operational and catalog DB tables

$data = @(
    @{
        Code = "SERUM_BILRUBI_2"
        TestCode = "SERUM_BILRUBI_2"
        Default = "0.1-1.0"
        AdultM = "0.1-1.0"; AdultF = "0.1-1.0"
        ChildM = "0.1-1.0"; ChildF = "0.1-1.0"
        InfantM = "0.1-1.0"; InfantF = "0.1-1.0"
        NewbornM = "0.1-1.0"; NewbornF = "0.1-1.0"
    },
    @{
        Code = "SERUM_BILRUBI_3"
        TestCode = "SERUM_BILRUBI_3"
        Default = "0.0-0.2"
        AdultM = "0.0-0.2"; AdultF = "0.0-0.2"
        ChildM = "0.0-0.2"; ChildF = "0.0-0.2"
        InfantM = "0.0-0.2"; InfantF = "0.0-0.2"
        NewbornM = "0.0-0.2"; NewbornF = "0.0-0.2"
    },
    @{
        Code = "TOTAL_PROTEIN"
        TestCode = "TOTAL_PROTEIN"
        Default = "6.0-8.0"
        AdultM = "6.0-8.0"; AdultF = "6.0-8.0"
        ChildM = "6.0-8.0"; ChildF = "6.0-8.0"
        InfantM = "6.0-8.0"; InfantF = "6.0-8.0"
        NewbornM = "6.0-8.0"; NewbornF = "6.0-8.0"
    },
    @{
        Code = "SERUM_ALBUMIN"
        TestCode = "ALBUMIN"
        Default = "3.5-5.0"
        AdultM = "3.5-5.0"; AdultF = "3.5-5.0"
        ChildM = "3.5-5.0"; ChildF = "3.5-5.0"
        InfantM = "3.5-5.0"; InfantF = "3.5-5.0"
        NewbornM = "3.5-5.0"; NewbornF = "3.5-5.0"
    },
    @{
        Code = "SERUM_GLOBULIN"
        TestCode = "GLOBULIN"
        Default = "2.0-3.5"
        AdultM = "2.0-3.5"; AdultF = "2.0-3.5"
        ChildM = "2.0-3.5"; ChildF = "2.0-3.5"
        InfantM = "2.0-3.5"; InfantF = "2.0-3.5"
        NewbornM = "2.0-3.5"; NewbornF = "2.0-3.5"
    },
    @{
        Code = "ALBUMIN_GLOBULI"
        TestCode = "ALBUMIN_GLOBULI"
        Default = "1.2-2.5"
        AdultM = "1.2-2.5"; AdultF = "1.2-2.5"
        ChildM = "1.2-2.5"; ChildF = "1.2-2.5"
        InfantM = "1.2-2.5"; InfantF = "1.2-2.5"
        NewbornM = "1.2-2.5"; NewbornF = "1.2-2.5"
    },
    @{
        Code = "ALANINE_AMINO_T"
        TestCode = "ALANINE_AMINO_T"
        Default = "0.0-40.0"
        AdultM = "0.0-40.0"; AdultF = "0.0-30.0"
        ChildM = "0.0-40.0"; ChildF = "0.0-30.0"
        InfantM = "0.0-40.0"; InfantF = "0.0-30.0"
        NewbornM = "0.0-40.0"; NewbornF = "0.0-30.0"
    },
    @{
        Code = "ASPARTATE_AMINO"
        TestCode = "ASPARTATE_AMINO"
        Default = "0.0-40.0"
        AdultM = "0.0-40.0"; AdultF = "0.0-30.0"
        ChildM = "0.0-40.0"; ChildF = "0.0-30.0"
        InfantM = "0.0-40.0"; InfantF = "0.0-30.0"
        NewbornM = "0.0-40.0"; NewbornF = "0.0-30.0"
    },
    @{
        Code = "ALKALINE_PHOS_2"
        TestCode = "ALKALINE_PHOS_2"
        Default = "50.0-125.0"
        AdultM = "50.0-125.0"; AdultF = "50.0-125.0"
        ChildM = "70.0-570.0"; ChildF = "70.0-570.0"
        InfantM = "70.0-570.0"; InfantF = "70.0-570.0"
        NewbornM = "70.0-570.0"; NewbornF = "70.0-570.0"
    }
)

Write-Host "Fetching Parameter IDs..."
function Get-SqlData($query) {
    $tempFile = [System.IO.Path]::GetTempFileName()
    sqlcmd -S "(localdb)\MSSQLLocalDB" -d "SynOSDb" -Q $query -s "," -W -h -1 > $tempFile
    $lines = Get-Content $tempFile | Where-Object { $_ -match "," }
    Remove-Item $tempFile -Force
    return $lines
}

# Fetch mapping of ParameterCode -> ParameterId specifically for LFT child parameters
$paramLines = Get-SqlData "SELECT p.ParameterId, p.ParameterCode FROM Parameters p JOIN Tests t ON p.TestId = t.TestId WHERE t.TestId IN (SELECT ChildTestId FROM ProfileMaps WHERE ParentTestId = (SELECT TestId FROM Tests WHERE TestCode = 'LFT_LIVER_FUNCT'));"
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
$parameterIdsStr = ($paramMap.Values | ForEach-Object { "'$_'" }) -join ","
$sql += "DELETE FROM ReferenceRanges WHERE ParameterId IN ($parameterIdsStr);`n"

# Also clean catalog ranges for these test codes
$testCodesStr = ($data.TestCode | ForEach-Object { "'$_'" }) -join ","
$sql += "DELETE FROM Catalog_ReferenceRanges WHERE TestCode IN ($testCodesStr);`n"

foreach ($row in $data) {
    $code = $row.Code
    $testCode = $row.TestCode
    $parameterId = $paramMap[$code]
    if (-not $parameterId) {
        Write-Warning "No operational ParameterId found for $code"
        continue
    }

    # Helper function to generate insert queries for both Catalog & Operational tables
    function Add-RangeQueries($sex, $ageGroup, $rangeStr, $ageMin, $ageMax) {
        $low = "NULL"
        $high = "NULL"
        if ($rangeStr -match "^(\d+(\.\d+)?)-(\d+(\.\d+)?)$") {
            $low = $Matches[1]
            $high = $Matches[3]
        }
        
        $opId = [Guid]::NewGuid().ToString()
        $catId = [Guid]::NewGuid().ToString()
        
        $sqlAgeMin = if ($ageMin -eq $null) { "NULL" } else { $ageMin }
        $sqlAgeMax = if ($ageMax -eq $null) { "NULL" } else { $ageMax }

        # 1. Operational Table (ReferenceRanges)
        $script:sql += "INSERT INTO ReferenceRanges (ReferenceRangeId, ParameterId, AgeGroup, AgeMin, AgeMax, Sex, RefLow, RefHigh, EffectiveFrom, IsActive, CreatedAt, UpdatedAt) VALUES ('$opId', '$parameterId', '$ageGroup', $sqlAgeMin, $sqlAgeMax, '$sex', $low, $high, GETDATE(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());`n"
        
        # 2. Catalog Table (Catalog_ReferenceRanges)
        $script:sql += "INSERT INTO Catalog_ReferenceRanges (Id, TestCode, ParameterCode, Sex, AgeMin, AgeMax, RefLow, RefHigh, EffectiveFrom, IsActive, CreatedAt, UpdatedAt) VALUES ('$catId', '$testCode', '$code', '$sex', $sqlAgeMin, $sqlAgeMax, $low, $high, GETDATE(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());`n"
    }

    # 1. Default (ALL, NULL, NULL)
    Add-RangeQueries -sex "ALL" -ageGroup "ALL" -rangeStr $row.Default -ageMin $null -ageMax $null

    # 2. Adult M (MALE, 12, 120)
    Add-RangeQueries -sex "Male" -ageGroup "Adult" -rangeStr $row.AdultM -ageMin 12 -ageMax 120

    # 3. Adult F (FEMALE, 12, 120)
    Add-RangeQueries -sex "Female" -ageGroup "Adult" -rangeStr $row.AdultF -ageMin 12 -ageMax 120

    # 4. Child M (MALE, 1, 12)
    Add-RangeQueries -sex "Male" -ageGroup "Child" -rangeStr $row.ChildM -ageMin 1 -ageMax 12

    # 5. Child F (FEMALE, 1, 12)
    Add-RangeQueries -sex "Female" -ageGroup "Child" -rangeStr $row.ChildF -ageMin 1 -ageMax 12

    # 6. Infant M (MALE, 0, 1)
    Add-RangeQueries -sex "Male" -ageGroup "Infant" -rangeStr $row.InfantM -ageMin 0 -ageMax 1

    # 7. Infant F (FEMALE, 0, 1)
    Add-RangeQueries -sex "Female" -ageGroup "Infant" -rangeStr $row.InfantF -ageMin 0 -ageMax 1

    # 8. Newborn M (MALE, 0, 0)
    Add-RangeQueries -sex "Male" -ageGroup "Newborn" -rangeStr $row.NewbornM -ageMin 0 -ageMax 0

    # 9. Newborn F (FEMALE, 0, 0)
    Add-RangeQueries -sex "Female" -ageGroup "Newborn" -rangeStr $row.NewbornF -ageMin 0 -ageMax 0
}

# Write SQL file
$sqlPath = Join-Path $PSScriptRoot "SeedLFTOperationalRanges.sql"
Set-Content -Path $sqlPath -Value $sql -Encoding UTF8
Write-Host "Generated SQL script at: $sqlPath"

# Execute SQL command
sqlcmd -S "(localdb)\MSSQLLocalDB" -d "SynOSDb" -i $sqlPath
Remove-Item $sqlPath -Force
Write-Host "Operational and Catalog LFT ReferenceRanges successfully updated in DB."
