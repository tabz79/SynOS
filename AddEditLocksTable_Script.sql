BEGIN TRANSACTION;
GO

CREATE TABLE [EditLocks] (
    [LockId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
    [EntityType] nvarchar(100) NOT NULL,
    [EntityId] uniqueidentifier NOT NULL,
    [LockedByUserId] uniqueidentifier NOT NULL,
    [LockedAt] datetimeoffset NOT NULL DEFAULT (SYSUTCDATETIME()),
    [ExpiresAt] datetimeoffset NOT NULL,
    [Status] nvarchar(20) NOT NULL DEFAULT ('Active'),
    CONSTRAINT [PK_EditLocks] PRIMARY KEY ([LockId]),
    CONSTRAINT [FK_EditLocks_Users_LockedByUserId] FOREIGN KEY ([LockedByUserId]) REFERENCES [Users] ([UserId]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [IX_EditLocks_EntityType_EntityId_Active] ON [EditLocks] ([EntityType], [EntityId]) WHERE [Status] = 'Active';
GO

CREATE INDEX [IX_EditLocks_ExpiresAt] ON [EditLocks] ([ExpiresAt]);
GO

CREATE INDEX [IX_EditLocks_LockedByUserId] ON [EditLocks] ([LockedByUserId]);
GO

COMMIT;
GO
