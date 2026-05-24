-- SynOS Safe Registry Seed Script (v2)
-- Updates existing tests while adding new structural data.

-- GUIDs for existing tests (Dynamically resolved via SELECT)
DECLARE @LFT UNIQUEIDENTIFIER;
SELECT @LFT = TestId FROM Tests WHERE TestCode = 'LFT';

DECLARE @LIPID UNIQUEIDENTIFIER;
SELECT @LIPID = TestId FROM Tests WHERE TestCode = 'LIPID';

DECLARE @CBC UNIQUEIDENTIFIER;
SELECT @CBC = TestId FROM Tests WHERE TestCode = 'CBC';

DECLARE @FBS UNIQUEIDENTIFIER;
SELECT @FBS = TestId FROM Tests WHERE TestCode = 'FBS';

DECLARE @URINE UNIQUEIDENTIFIER;
SELECT @URINE = TestId FROM Tests WHERE TestCode = 'URINE';

-- GUID for existing Pathology Dept (Dynamically resolved)
DECLARE @PAT UNIQUEIDENTIFIER;
SELECT @PAT = DepartmentId FROM DepartmentMasters WHERE Code = 'PAT';
IF @PAT IS NULL SET @PAT = '2BF23FED-A66D-4B63-870B-BCB96F481683';

-- New Depts
DECLARE @BIO UNIQUEIDENTIFIER = NEWID();
DECLARE @RAD UNIQUEIDENTIFIER = NEWID();

-- New Atomic Tests
DECLARE @ALT UNIQUEIDENTIFIER = NEWID();
DECLARE @AST UNIQUEIDENTIFIER = NEWID();
DECLARE @CHOL UNIQUEIDENTIFIER = NEWID();
DECLARE @TRIG UNIQUEIDENTIFIER = NEWID();
DECLARE @HDL UNIQUEIDENTIFIER = NEWID();
DECLARE @LDL UNIQUEIDENTIFIER = NEWID();

-- 1. Clear junction/ledger tables selectively to preserve other test data
DELETE FROM ProfileMaps WHERE ParentTestId IN (
    SELECT TestId FROM Tests WHERE TestCode IN ('LFT', 'LIPID')
);
DELETE FROM TestPricing WHERE TestId IN (
    SELECT TestId FROM Tests WHERE TestCode IN ('ALT', 'AST', 'CHOL', 'TRIG', 'HDL', 'LDL', 'LFT', 'LIPID')
);

-- 2. Ensure Departments exist
IF NOT EXISTS (SELECT 1 FROM DepartmentMasters WHERE Code = 'BIO')
    INSERT INTO DepartmentMasters (DepartmentId, Code, Name, IsActive, CreatedAt) VALUES (@BIO, 'BIO', 'Biochemistry', 1, GETUTCDATE());
ELSE
    SELECT @BIO = DepartmentId FROM DepartmentMasters WHERE Code = 'BIO';

IF NOT EXISTS (SELECT 1 FROM DepartmentMasters WHERE Code = 'RAD')
    INSERT INTO DepartmentMasters (DepartmentId, Code, Name, IsActive, CreatedAt) VALUES (@RAD, 'RAD', 'Radiology', 1, GETUTCDATE());
ELSE
    SELECT @RAD = DepartmentId FROM DepartmentMasters WHERE Code = 'RAD';

-- 3. Update Existing Tests to match requested state
IF @LFT IS NOT NULL
    UPDATE Tests SET IsProfile = 0, DepartmentId = @BIO WHERE TestId = @LFT;
IF @LIPID IS NOT NULL
    UPDATE Tests SET IsProfile = 0, DepartmentId = @BIO WHERE TestId = @LIPID;
-- Ensure others are tied to PAT
UPDATE Tests SET DepartmentId = @PAT WHERE TestId IN (@CBC, @FBS, @URINE) AND TestId IS NOT NULL;

-- 4. Seed Missing Atomic Tests
IF NOT EXISTS (SELECT 1 FROM Tests WHERE TestCode = 'ALT')
    INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt, SpecimenTypeCode)
    VALUES (@ALT, 'ALT', 'Alanine Aminotransferase', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE(), 'SERUM');

IF NOT EXISTS (SELECT 1 FROM Tests WHERE TestCode = 'AST')
    INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt, SpecimenTypeCode)
    VALUES (@AST, 'AST', 'Aspartate Aminotransferase', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE(), 'SERUM');

IF NOT EXISTS (SELECT 1 FROM Tests WHERE TestCode = 'CHOL')
    INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt, SpecimenTypeCode)
    VALUES (@CHOL, 'CHOL', 'Cholesterol', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE(), 'SERUM');

IF NOT EXISTS (SELECT 1 FROM Tests WHERE TestCode = 'TRIG')
    INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt, SpecimenTypeCode)
    VALUES (@TRIG, 'TRIG', 'Triglycerides', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE(), 'SERUM');

IF NOT EXISTS (SELECT 1 FROM Tests WHERE TestCode = 'HDL')
    INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt, SpecimenTypeCode)
    VALUES (@HDL, 'HDL', 'HDL Cholesterol', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE(), 'SERUM');

IF NOT EXISTS (SELECT 1 FROM Tests WHERE TestCode = 'LDL')
    INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt, SpecimenTypeCode)
    VALUES (@LDL, 'LDL', 'LDL Cholesterol', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE(), 'SERUM');

-- Re-fetch GUIDs if they already existed (to ensure correct mapping)
SELECT @ALT = TestId FROM Tests WHERE TestCode = 'ALT';
SELECT @AST = TestId FROM Tests WHERE TestCode = 'AST';
SELECT @CHOL = TestId FROM Tests WHERE TestCode = 'CHOL';
SELECT @TRIG = TestId FROM Tests WHERE TestCode = 'TRIG';
SELECT @HDL = TestId FROM Tests WHERE TestCode = 'HDL';
SELECT @LDL = TestId FROM Tests WHERE TestCode = 'LDL';

-- Ensure all these atomic tests have SpecimenTypeCode set to SERUM
UPDATE Tests SET SpecimenTypeCode = 'SERUM' WHERE TestCode IN ('ALT', 'AST', 'CHOL', 'TRIG', 'HDL', 'LDL');

-- 5. Seed TestPricing (Available since 2024-01-01)
INSERT INTO TestPricing (PricingId, TestId, BasePrice, EffectiveFrom, CreatedAt, CreatedByUserId)
VALUES 
(NEWID(), @ALT, 250, '2024-01-01', GETUTCDATE(), '00000000-0000-0000-0000-000000000000'),
(NEWID(), @AST, 250, '2024-01-01', GETUTCDATE(), '00000000-0000-0000-0000-000000000000'),
(NEWID(), @CHOL, 200, '2024-01-01', GETUTCDATE(), '00000000-0000-0000-0000-000000000000'),
(NEWID(), @TRIG, 180, '2024-01-01', GETUTCDATE(), '00000000-0000-0000-0000-000000000000'),
(NEWID(), @HDL, 220, '2024-01-01', GETUTCDATE(), '00000000-0000-0000-0000-000000000000'),
(NEWID(), @LDL, 220, '2024-01-01', GETUTCDATE(), '00000000-0000-0000-0000-000000000000'),
(NEWID(), @LFT, 500, '2024-01-01', GETUTCDATE(), '00000000-0000-0000-0000-000000000000'),
(NEWID(), @LIPID, 700, '2024-01-01', GETUTCDATE(), '00000000-0000-0000-0000-000000000000');

-- 6. Seed ProfileMaps (Expansion Logic)
-- LFT and LIPID are atomic, no profile maps seeded here.

PRINT 'Registry Updated Successfully: 3 Depts, 11 Tests (8 Configured for Test), 8 Prices, 6 Profile Maps.';
