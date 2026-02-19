-- SynOS Clean Registry Seed Script
-- Purpose: Reset registry to a known good state for operational flow validation.

DECLARE @BIO UNIQUEIDENTIFIER = NEWID();
DECLARE @PAT UNIQUEIDENTIFIER = NEWID();
DECLARE @RAD UNIQUEIDENTIFIER = NEWID();

-- Atomic Tests (BIO)
DECLARE @ALT UNIQUEIDENTIFIER = NEWID();
DECLARE @AST UNIQUEIDENTIFIER = NEWID();
DECLARE @CHOL UNIQUEIDENTIFIER = NEWID();
DECLARE @TRIG UNIQUEIDENTIFIER = NEWID();
DECLARE @HDL UNIQUEIDENTIFIER = NEWID();
DECLARE @LDL UNIQUEIDENTIFIER = NEWID();

-- Profiles (BIO)
DECLARE @LFT UNIQUEIDENTIFIER = NEWID();
DECLARE @LIPID UNIQUEIDENTIFIER = NEWID();

-- 1. Wipe Existing Registry Data
DELETE FROM ProfileMaps;
DELETE FROM TestPricing;
DELETE FROM Tests;
DELETE FROM DepartmentMasters;

-- 2. Seed Departments
INSERT INTO DepartmentMasters (DepartmentId, Code, Name, IsActive, CreatedAt)
VALUES 
(@BIO, 'BIO', 'Biochemistry', 1, GETUTCDATE()),
(@PAT, 'PAT', 'Pathology', 1, GETUTCDATE()),
(@RAD, 'RAD', 'Radiology', 1, GETUTCDATE());

-- 3. Seed Atomic Tests
INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt)
VALUES 
(@ALT, 'ALT', 'Alanine Aminotransferase', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE()),
(@AST, 'AST', 'Aspartate Aminotransferase', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE()),
(@CHOL, 'CHOL', 'Cholesterol', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE()),
(@TRIG, 'TRIG', 'Triglycerides', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE()),
(@HDL, 'HDL', 'HDL Cholesterol', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE()),
(@LDL, 'LDL', 'LDL Cholesterol', 'Clinical BIO', 0, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE());

-- 4. Seed Profiles
INSERT INTO Tests (TestId, TestCode, TestName, Category, IsProfile, DepartmentId, TAT_Hours, IsActive, CreatedAt, UpdatedAt)
VALUES 
(@LFT, 'LFT', 'Liver Function Test', 'Profile', 1, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE()),
(@LIPID, 'LIPID', 'Lipid Profile', 'Profile', 1, @BIO, 24, 1, GETUTCDATE(), GETUTCDATE());

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

PRINT 'Registry Seeded Successfully: 3 Depts, 8 Tests, 8 Prices, 6 Profile Maps.';
