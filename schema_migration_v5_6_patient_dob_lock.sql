-- Phase 5.6: Patient DOB Compatibility Layer

-- 1. Add semantic truth flag
IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = 'IsDateOfBirthKnown' AND Object_ID = Object_ID('Patients'))
BEGIN
    ALTER TABLE Patients
    ADD IsDateOfBirthKnown BIT NOT NULL DEFAULT 0;
    PRINT 'Patients.IsDateOfBirthKnown added.';
END
GO

-- 2. Normalize existing NULL DOBs (from previous hardening attempt)
-- If a patient had a DOB, they are considered "Known".
UPDATE Patients
SET IsDateOfBirthKnown = 1
WHERE DateOfBirth IS NOT NULL;

-- If they didn't have one, we set the internal sentinel and mark as "Unknown"
UPDATE Patients
SET DateOfBirth = '1900-01-01',
    IsDateOfBirthKnown = 0
WHERE DateOfBirth IS NULL;
PRINT 'Existing patient DOBs normalized.';
GO

-- 3. Re-lock DateOfBirth column
ALTER TABLE Patients
ALTER COLUMN DateOfBirth DATETIME2 NOT NULL;
PRINT 'Patients.DateOfBirth locked as NOT NULL.';
GO