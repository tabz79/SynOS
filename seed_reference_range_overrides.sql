-- 1. Get Parameter GUIDs from database
DECLARE @TOTAL_T3_Id uniqueidentifier;
DECLARE @TOTAL_T4_Id uniqueidentifier;
DECLARE @TSH_Id uniqueidentifier;

SELECT @TOTAL_T3_Id = ParameterId FROM Parameters WHERE ParameterCode = 'TOTAL_T3' AND TestId IN (SELECT TestId FROM Tests WHERE TestCode = 'T3_T4_TSH');
SELECT @TOTAL_T4_Id = ParameterId FROM Parameters WHERE ParameterCode = 'TOTAL_T4' AND TestId IN (SELECT TestId FROM Tests WHERE TestCode = 'T3_T4_TSH');
SELECT @TSH_Id = ParameterId FROM Parameters WHERE ParameterCode = 'TSH' AND TestId IN (SELECT TestId FROM Tests WHERE TestCode = 'T3_T4_TSH');

-- 2. Clear existing ranges for T3, T4, TSH (except the default ALL/ALL range if we want to keep it, but let's clear custom overrides to prevent duplicates)
DELETE FROM Catalog_ReferenceRanges WHERE TestCode = 'T3_T4_TSH' AND (AgeMin IS NOT NULL OR AgeMax IS NOT NULL OR Sex IN ('Male', 'Female'));
DELETE FROM ReferenceRanges WHERE ParameterId IN (@TOTAL_T3_Id, @TOTAL_T4_Id, @TSH_Id) AND AgeGroup IN ('Newborn', 'Infant', 'Child', 'Adult');

-- 3. Seed Catalog Overrides (Catalog_ReferenceRanges)
-- TOTAL_T3
INSERT INTO Catalog_ReferenceRanges (Id, TestCode, ParameterCode, Sex, AgeMin, AgeMax, RefLow, RefHigh, TextRange, EffectiveFrom, IsActive, CreatedAt, UpdatedAt)
VALUES
(NEWID(), 'T3_T4_TSH', 'TOTAL_T3', 'Male', 0, 0, 0.75, 2.60, '0.75 - 2.60', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T3', 'Female', 0, 0, 0.75, 2.60, '0.75 - 2.60', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T3', 'Male', 0, 1, 1.00, 2.60, '1.00 - 2.60', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T3', 'Female', 0, 1, 1.00, 2.60, '1.00 - 2.60', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T3', 'Male', 1, 12, 0.90, 2.40, '0.90 - 2.40', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T3', 'Female', 1, 12, 0.90, 2.40, '0.90 - 2.40', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T3', 'Male', 12, 120, 0.70, 2.15, '0.70 - 2.15', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T3', 'Female', 12, 120, 0.70, 2.15, '0.70 - 2.15', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE());

-- TOTAL_T4
INSERT INTO Catalog_ReferenceRanges (Id, TestCode, ParameterCode, Sex, AgeMin, AgeMax, RefLow, RefHigh, TextRange, EffectiveFrom, IsActive, CreatedAt, UpdatedAt)
VALUES
(NEWID(), 'T3_T4_TSH', 'TOTAL_T4', 'Male', 0, 0, 8.20, 19.90, '8.20 - 19.90', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T4', 'Female', 0, 0, 8.20, 19.90, '8.20 - 19.90', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T4', 'Male', 0, 1, 6.10, 14.90, '6.10 - 14.90', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T4', 'Female', 0, 1, 6.10, 14.90, '6.10 - 14.90', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T4', 'Male', 1, 12, 5.50, 12.80, '5.50 - 12.80', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T4', 'Female', 1, 12, 5.50, 12.80, '5.50 - 12.80', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T4', 'Male', 12, 120, 5.20, 12.70, '5.20 - 12.70', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TOTAL_T4', 'Female', 12, 120, 5.20, 12.70, '5.20 - 12.70', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE());

-- TSH
INSERT INTO Catalog_ReferenceRanges (Id, TestCode, ParameterCode, Sex, AgeMin, AgeMax, RefLow, RefHigh, TextRange, EffectiveFrom, IsActive, CreatedAt, UpdatedAt)
VALUES
(NEWID(), 'T3_T4_TSH', 'TSH', 'Male', 0, 0, 3.20, 34.60, '3.20 - 34.60', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TSH', 'Female', 0, 0, 3.20, 34.60, '3.20 - 34.60', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TSH', 'Male', 0, 1, 1.70, 9.10, '1.70 - 9.10', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TSH', 'Female', 0, 1, 1.70, 9.10, '1.70 - 9.10', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TSH', 'Male', 1, 12, 0.70, 6.40, '0.70 - 6.40', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TSH', 'Female', 1, 12, 0.70, 6.40, '0.70 - 6.40', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TSH', 'Male', 12, 120, 0.40, 4.50, '0.40 - 4.50', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'T3_T4_TSH', 'TSH', 'Female', 12, 120, 0.40, 4.50, '0.40 - 4.50', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE());


-- 4. Seed Operational Overrides (ReferenceRanges)
-- TOTAL_T3
INSERT INTO ReferenceRanges (ReferenceRangeId, ParameterId, AgeGroup, Sex, RefLow, RefHigh, TextRange, EffectiveFrom, IsActive, CreatedAt, UpdatedAt)
VALUES
(NEWID(), @TOTAL_T3_Id, 'Newborn', 'Male', 0.75, 2.60, '0.75 - 2.60', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T3_Id, 'Newborn', 'Female', 0.75, 2.60, '0.75 - 2.60', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T3_Id, 'Infant', 'Male', 1.00, 2.60, '1.00 - 2.60', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T3_Id, 'Infant', 'Female', 1.00, 2.60, '1.00 - 2.60', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T3_Id, 'Child', 'Male', 0.90, 2.40, '0.90 - 2.40', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T3_Id, 'Child', 'Female', 0.90, 2.40, '0.90 - 2.40', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T3_Id, 'Adult', 'Male', 0.70, 2.15, '0.70 - 2.15', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T3_Id, 'Adult', 'Female', 0.70, 2.15, '0.70 - 2.15', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE());

-- TOTAL_T4
INSERT INTO ReferenceRanges (ReferenceRangeId, ParameterId, AgeGroup, Sex, RefLow, RefHigh, TextRange, EffectiveFrom, IsActive, CreatedAt, UpdatedAt)
VALUES
(NEWID(), @TOTAL_T4_Id, 'Newborn', 'Male', 8.20, 19.90, '8.20 - 19.90', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T4_Id, 'Newborn', 'Female', 8.20, 19.90, '8.20 - 19.90', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T4_Id, 'Infant', 'Male', 6.10, 14.90, '6.10 - 14.90', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T4_Id, 'Infant', 'Female', 6.10, 14.90, '6.10 - 14.90', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T4_Id, 'Child', 'Male', 5.50, 12.80, '5.50 - 12.80', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T4_Id, 'Child', 'Female', 5.50, 12.80, '5.50 - 12.80', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T4_Id, 'Adult', 'Male', 5.20, 12.70, '5.20 - 12.70', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TOTAL_T4_Id, 'Adult', 'Female', 5.20, 12.70, '5.20 - 12.70', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE());

-- TSH
INSERT INTO ReferenceRanges (ReferenceRangeId, ParameterId, AgeGroup, Sex, RefLow, RefHigh, TextRange, EffectiveFrom, IsActive, CreatedAt, UpdatedAt)
VALUES
(NEWID(), @TSH_Id, 'Newborn', 'Male', 3.20, 34.60, '3.20 - 34.60', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TSH_Id, 'Newborn', 'Female', 3.20, 34.60, '3.20 - 34.60', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TSH_Id, 'Infant', 'Male', 1.70, 9.10, '1.70 - 9.10', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TSH_Id, 'Infant', 'Female', 1.70, 9.10, '1.70 - 9.10', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TSH_Id, 'Child', 'Male', 0.70, 6.40, '0.70 - 6.40', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TSH_Id, 'Child', 'Female', 0.70, 6.40, '0.70 - 6.40', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TSH_Id, 'Adult', 'Male', 0.40, 4.50, '0.40 - 4.50', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE()),
(NEWID(), @TSH_Id, 'Adult', 'Female', 0.40, 4.50, '0.40 - 4.50', GETUTCDATE(), 1, GETUTCDATE(), GETUTCDATE());
