-- Catalog_Parameters
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'NarrativeTemplate' AND Object_ID = OBJECT_ID(N'Catalog_Parameters'))
BEGIN
    ALTER TABLE [Catalog_Parameters] ADD [NarrativeTemplate] nvarchar(max) NULL;
END
GO

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'ShowNarrative' AND Object_ID = OBJECT_ID(N'Catalog_Parameters'))
BEGIN
    ALTER TABLE [Catalog_Parameters] ADD [ShowNarrative] bit NOT NULL DEFAULT 0;
END
GO

-- Parameters
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'NarrativeTemplate' AND Object_ID = OBJECT_ID(N'Parameters'))
BEGIN
    ALTER TABLE [Parameters] ADD [NarrativeTemplate] nvarchar(max) NULL;
END
GO

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'ShowNarrative' AND Object_ID = OBJECT_ID(N'Parameters'))
BEGIN
    ALTER TABLE [Parameters] ADD [ShowNarrative] bit NOT NULL DEFAULT 0;
END
GO
