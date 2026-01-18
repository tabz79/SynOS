-- Phase 2.5: Discount Master Canonical Lock

-- 1. Pre-Flight Check: Detect Duplicates or Empty Codes
IF EXISTS (
    SELECT 1 
    FROM [DiscountMasters]
    GROUP BY [Code]
    HAVING [Code] = '' OR COUNT(*) > 1
)
BEGIN
    -- Abort if data integrity is violated
    THROW 50001, 'Duplicate or empty DiscountMaster.Code detected. Canonical lock aborted. Manual cleanup required.', 1;
END
GO

-- 2. Apply Canonical Lock (Unique Index)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_DiscountMasters_Code' AND object_id = OBJECT_ID('DiscountMasters'))
BEGIN
    CREATE UNIQUE INDEX [UX_DiscountMasters_Code] ON [DiscountMasters]([Code]);
    PRINT 'Canonical lock applied: UX_DiscountMasters_Code created successfully.';
END
ELSE
BEGIN
    PRINT 'Canonical lock already exists.';
END
GO
