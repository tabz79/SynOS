-- SynOS Safe Registry Seed Script (v2)
-- Updates existing tests while adding new structural data.

-- GUIDs for existing tests (Confirmed via SELECT)
DECLARE @LFT UNIQUEIDENTIFIER = 'B76A22DE-21FF-4E49-AC01-B8C560B711CC';
DECLARE @LIPID UNIQUEIDENTIFIER = '4C2E69D8-637E-431C-AF01-1362764192DE';
DECLARE @CBC UNIQUEIDENTIFIER = '2E7A2190-AAAA-4648-BBF0-7B3A6A1C2C9B';
DECLARE @FBS UNIQUEIDENTIFIER = '77363CB5-A49C-434F-BAB8-BD7CF077BC9F';
DECLARE @URINE UNIQUEIDENTIFIER = '6FFB5684-A955-4D6A-B330-E27FEA88559A';

-- GUID for existing Pathology Dept
DECLARE @PAT UNIQUEIDENTIFIER = '2BF23FED-A66D-4B63-870B-BCB96F481683';

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

-- 1. Clear junction/ledger tables (Safe since they are newborn)
DELETE FROM ProfileMaps;
DELETE FROM TestPricing;

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
UPDATE Tests SET IsProfile = 1, DepartmentId = @BIO WHERE TestId = @LFT;
UPDATE Tests SET IsProfile = 1, DepartmentId = @BIO WHERE TestId = @LIPID;
-- Ensure others are tied to PAT
UPDATE Tests SET DepartmentId = @PAT WHERE TestId IN (@CBC, @FBS, @URINE);

-- 4. Seed Missing Atomic Tests
IF NOT EXISTS (SELECT 1 FROM Tests WHERE TestCode = 'ALT')
    INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt)
    VALUES (@ALT, 'ALT', 'Alanine Aminotransferase', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM Tests WHERE TestCode = 'AST')
    INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt)
    VALUES (@AST, 'AST', 'Aspartate Aminotransferase', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM Tests WHERE TestCode = 'CHOL')
    INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt)
    VALUES (@CHOL, 'CHOL', 'Cholesterol', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM Tests WHERE TestCode = 'TRIG')
    INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt)
    VALUES (@TRIG, 'TRIG', 'Triglycerides', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM Tests WHERE TestCode = 'HDL')
    INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt)
    VALUES (@HDL, 'HDL', 'HDL Cholesterol', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM Tests WHERE TestCode = 'LDL')
    INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt)
    VALUES (@LDL, 'LDL', 'LDL Cholesterol', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE());

-- Re-fetch GUIDs if they already existed (to ensure correct mapping)
SELECT @ALT = TestId FROM Tests WHERE TestCode = 'ALT';
SELECT @AST = TestId FROM Tests WHERE TestCode = 'AST';
SELECT @CHOL = TestId FROM Tests WHERE TestCode = 'CHOL';
SELECT @TRIG = TestId FROM Tests WHERE TestCode = 'TRIG';
SELECT @HDL = TestId FROM Tests WHERE TestCode = 'HDL';
SELECT @LDL = TestId FROM Tests WHERE TestCode = 'LDL';

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
INSERT INTO ProfileMaps (ProfileMapId, ParentTestId, ChildTestId, Sequence)
VALUES 
(NEWID(), @LFT, @ALT, 1),
(NEWID(), @LFT, @AST, 2),
(NEWID(), @LIPID, @CHOL, 1),
(NEWID(), @LIPID, @TRIG, 2),
(NEWID(), @LIPID, @HDL, 3),
(NEWID(), @LIPID, @LDL, 4);

PRINT 'Registry Updated Successfully: 3 Depts, 11 Tests (8 Configured for Test), 8 Prices, 6 Profile Maps.';
