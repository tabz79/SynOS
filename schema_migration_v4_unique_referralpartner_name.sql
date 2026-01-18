-- Phase 4.5: Referral Partner Canonical Lock

-- 1. Pre-Flight Check: Detect Duplicates
IF EXISTS (
    SELECT 1 
    FROM [ReferralPartners]
    GROUP BY [Name]
    HAVING COUNT(*) > 1
)
BEGIN
    -- Abort if data integrity is violated
    THROW 50001, 'Duplicate ReferralPartner.Name detected. Canonical lock aborted. Manual cleanup required.', 1;
END
GO

-- 2. Apply Canonical Lock (Unique Index)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_ReferralPartners_Name' AND object_id = OBJECT_ID('ReferralPartners'))
BEGIN
    CREATE UNIQUE INDEX [UX_ReferralPartners_Name] ON [ReferralPartners]([Name]);
    PRINT 'Canonical lock applied: UX_ReferralPartners_Name created successfully.';
END
ELSE
BEGIN
    PRINT 'Canonical lock already exists.';
END
GO