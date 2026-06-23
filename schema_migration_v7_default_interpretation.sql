-- Catalog_Tests
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'DefaultInterpretation' AND Object_ID = OBJECT_ID(N'Catalog_Tests'))
BEGIN
    ALTER TABLE [Catalog_Tests] ADD [DefaultInterpretation] nvarchar(max) NULL;
    ALTER TABLE [Catalog_Tests] ADD [DefaultInterpretationLastUpdatedAt] datetimeoffset NULL;
    ALTER TABLE [Catalog_Tests] ADD [DefaultInterpretationLastUpdatedBy] uniqueidentifier NULL;
END
GO

-- Tests
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'DefaultInterpretation' AND Object_ID = OBJECT_ID(N'Tests'))
BEGIN
    ALTER TABLE [Tests] ADD [DefaultInterpretation] nvarchar(max) NULL;
    ALTER TABLE [Tests] ADD [DefaultInterpretationLastUpdatedAt] datetimeoffset NULL;
    ALTER TABLE [Tests] ADD [DefaultInterpretationLastUpdatedBy] uniqueidentifier NULL;
END
GO
