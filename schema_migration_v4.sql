-- Migration V4: Referral Partner Enhancements

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[ReferralPartners]') AND name = 'PaymentCollectionModel')
BEGIN
    ALTER TABLE [ReferralPartners] ADD [PaymentCollectionModel] nvarchar(50) NOT NULL DEFAULT 'LabCollects';
END
GO
