-- Migration V3: Discount Master Enhancements

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[DiscountMasters]') AND name = 'Code')
BEGIN
    ALTER TABLE [DiscountMasters] ADD [Code] nvarchar(50) NOT NULL DEFAULT '';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[DiscountMasters]') AND name = 'Value')
BEGIN
    ALTER TABLE [DiscountMasters] ADD [Value] decimal(18, 2) NOT NULL DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[DiscountMasters]') AND name = 'EffectiveFrom')
BEGIN
    ALTER TABLE [DiscountMasters] ADD [EffectiveFrom] datetime2 NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[DiscountMasters]') AND name = 'EffectiveTo')
BEGIN
    ALTER TABLE [DiscountMasters] ADD [EffectiveTo] datetime2 NULL;
END
GO

-- Ensure DiscountFacts table exists (if not created by EF)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[DiscountFacts]') AND type in (N'U'))
BEGIN
    CREATE TABLE [DiscountFacts] (
        [DiscountFactId] uniqueidentifier NOT NULL,
        [InvoiceId] uniqueidentifier NOT NULL,
        [DiscountDefinitionId] uniqueidentifier NOT NULL,
        [GrossAmount] decimal(12, 2) NOT NULL,
        [DiscountAmount] decimal(12, 2) NOT NULL,
        [NetAmountAfterDiscount] decimal(12, 2) NOT NULL,
        [AppliedBy] nvarchar(256) NOT NULL,
        [AppliedAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_DiscountFacts] PRIMARY KEY ([DiscountFactId])
    );
    CREATE INDEX [IX_DiscountFacts_InvoiceId] ON [DiscountFacts] ([InvoiceId]);
END
GO