-- Phase 5 Hardening: Enterprise Patient Identity

-- 1. Create MRN Sequence (Safe Start)
IF NOT EXISTS (SELECT * FROM sys.sequences WHERE name = 'PATIENT_MRN_SEQ')
BEGIN
    DECLARE @MaxMRN INT;
    SELECT @MaxMRN = ISNULL(MAX(TRY_CAST(MRN AS INT)), 0) FROM Patients;
    
    -- Ensure we start above existing range
    DECLARE @StartVal INT = @MaxMRN + 1;
    IF @StartVal < 100000 SET @StartVal = 100000; -- Enterprise baseline

    DECLARE @SQL NVARCHAR(MAX) = 'CREATE SEQUENCE PATIENT_MRN_SEQ START WITH ' + CAST(@StartVal AS NVARCHAR(20)) + ' INCREMENT BY 1;';
    EXEC(@SQL);
    PRINT 'PATIENT_MRN_SEQ created.';
END
GO

-- 2. Alter DateOfBirth to be Nullable (Truthful Data)
-- First drop constraint if any (usually none on simple datetime2, but check if needed)
ALTER TABLE Patients ALTER COLUMN DateOfBirth DATETIME2 NULL;
PRINT 'Patients.DateOfBirth made nullable.';
GO

-- 3. Add DisplayName (Culturally Safe Name)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = 'DisplayName' AND Object_ID = Object_ID('Patients'))
BEGIN
    ALTER TABLE Patients ADD DisplayName NVARCHAR(256) NULL;
    PRINT 'Patients.DisplayName added.';
END
GO

-- 4. Backfill DisplayName (Legacy Safety)
UPDATE Patients
SET DisplayName = 
    COALESCE(NULLIF(LTRIM(RTRIM(
        CONCAT(FirstName, ' ', LastName)
    )), ''), FirstName, LastName)
WHERE DisplayName IS NULL;
PRINT 'Patients.DisplayName backfilled.';
GO