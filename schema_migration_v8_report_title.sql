-- Add ReportTitle column to Tests and Catalog_Tests
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'ReportTitle')
BEGIN
    ALTER TABLE Tests ADD ReportTitle NVARCHAR(200) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Catalog_Tests') AND name = 'ReportTitle')
BEGIN
    ALTER TABLE Catalog_Tests ADD ReportTitle NVARCHAR(200) NULL;
END
GO
