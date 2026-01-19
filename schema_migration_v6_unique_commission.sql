-- Phase 6.3 Step 3.5: Commission Idempotency Guard
-- This script adds a unique constraint to ReferralPayableFacts to prevent duplicate commission liability records.

IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_ReferralPayableFacts_SourceVisitId' AND object_id = OBJECT_ID('ReferralPayableFacts'))
BEGIN
    CREATE UNIQUE INDEX [IX_ReferralPayableFacts_SourceVisitId] ON [ReferralPayableFacts] ([SourceVisitId]);
END
GO
