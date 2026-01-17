-- Migration to add Operational Counters Read Models and update Event Stream

-- 1. Alter BranchOperationalEvents to support entity lookups
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[BranchOperationalEvents]') AND name = 'SourceId')
BEGIN
    ALTER TABLE [BranchOperationalEvents] ADD [SourceId] uniqueidentifier NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[BranchOperationalEvents]') AND name = 'SourceType')
BEGIN
    ALTER TABLE [BranchOperationalEvents] ADD [SourceType] nvarchar(max) NULL;
END
GO

-- 2. Create UserOperationalStats
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[UserOperationalStats]') AND type in (N'U'))
BEGIN
    CREATE TABLE [UserOperationalStats] (
        [UserId] uniqueidentifier NOT NULL,
        [BranchId] uniqueidentifier NOT NULL,
        [Date] datetime2 NOT NULL,
        [WalkInsCount] int NOT NULL,
        [PaymentsTotal] decimal(18, 2) NOT NULL,
        [ReportTatTotalMinutes] float NOT NULL,
        [ReportTatCount] int NOT NULL,
        [LastUpdated] datetime2 NOT NULL,
        CONSTRAINT [PK_UserOperationalStats] PRIMARY KEY ([UserId], [BranchId], [Date])
    );
    CREATE INDEX [IX_UserOperationalStats_UserId_BranchId_Date] ON [UserOperationalStats] ([UserId], [BranchId], [Date]);
END
GO

-- 3. Create BranchOperationalStats
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[BranchOperationalStats]') AND type in (N'U'))
BEGIN
    CREATE TABLE [BranchOperationalStats] (
        [BranchId] uniqueidentifier NOT NULL,
        [Date] datetime2 NOT NULL,
        [PendingReportsCount] int NOT NULL,
        [LastUpdated] datetime2 NOT NULL,
        CONSTRAINT [PK_BranchOperationalStats] PRIMARY KEY ([BranchId], [Date])
    );
    CREATE INDEX [IX_BranchOperationalStats_BranchId_Date] ON [BranchOperationalStats] ([BranchId], [Date]);
END
GO

-- 4. Create ProcessedProjectionEvents (Idempotency)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[ProcessedProjectionEvents]') AND type in (N'U'))
BEGIN
    CREATE TABLE [ProcessedProjectionEvents] (
        [EventId] uniqueidentifier NOT NULL,
        [ProjectionName] nvarchar(100) NOT NULL,
        [ProcessedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ProcessedProjectionEvents] PRIMARY KEY ([EventId], [ProjectionName])
    );
    CREATE INDEX [IX_ProcessedProjectionEvents_EventId] ON [ProcessedProjectionEvents] ([EventId]);
END
GO