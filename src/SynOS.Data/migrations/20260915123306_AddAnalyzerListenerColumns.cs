using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAnalyzerListenerColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Idempotently add SnapshotMetadataJson to ReportTemplates
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ReportTemplates') AND name = 'SnapshotMetadataJson')
                BEGIN
                    ALTER TABLE [ReportTemplates] ADD [SnapshotMetadataJson] nvarchar(2000) NULL;
                END
            ");

            // 2. Idempotently ensure AnalyzerListeners columns exist
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM sys.tables WHERE name = 'AnalyzerListeners' AND type = 'U')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'BaudRate')
                        ALTER TABLE [AnalyzerListeners] ADD [BaudRate] int NOT NULL DEFAULT 9600;

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'ConnectionMode')
                        ALTER TABLE [AnalyzerListeners] ADD [ConnectionMode] nvarchar(20) NOT NULL DEFAULT 'TcpServer';

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'DataBits')
                        ALTER TABLE [AnalyzerListeners] ADD [DataBits] int NOT NULL DEFAULT 8;

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'Handshake')
                        ALTER TABLE [AnalyzerListeners] ADD [Handshake] nvarchar(max) NOT NULL DEFAULT 'None';

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'HostIpAddress')
                        ALTER TABLE [AnalyzerListeners] ADD [HostIpAddress] nvarchar(50) NULL;

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'IsActive')
                        ALTER TABLE [AnalyzerListeners] ADD [IsActive] bit NOT NULL DEFAULT 1;

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'Parity')
                        ALTER TABLE [AnalyzerListeners] ADD [Parity] nvarchar(max) NOT NULL DEFAULT 'None';

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'SerialPortName')
                        ALTER TABLE [AnalyzerListeners] ADD [SerialPortName] nvarchar(20) NULL;

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'StopBits')
                        ALTER TABLE [AnalyzerListeners] ADD [StopBits] nvarchar(max) NOT NULL DEFAULT 'One';

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'WatchFolderPath')
                        ALTER TABLE [AnalyzerListeners] ADD [WatchFolderPath] nvarchar(260) NULL;

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'WorklistMode')
                        ALTER TABLE [AnalyzerListeners] ADD [WorklistMode] nvarchar(30) NOT NULL DEFAULT 'Unidirectional';
                END
                ELSE
                BEGIN
                    CREATE TABLE [AnalyzerListeners] (
                        [AnalyzerListenerId] uniqueidentifier NOT NULL,
                        [AnalyzerId] uniqueidentifier NOT NULL,
                        [Protocol] nvarchar(50) NOT NULL DEFAULT 'ASTM',
                        [ConnectionMode] nvarchar(20) NOT NULL DEFAULT 'TcpServer',
                        [Port] int NOT NULL DEFAULT 5000,
                        [HostIpAddress] nvarchar(50) NULL,
                        [SerialPortName] nvarchar(20) NULL,
                        [BaudRate] int NOT NULL DEFAULT 9600,
                        [DataBits] int NOT NULL DEFAULT 8,
                        [Parity] nvarchar(max) NOT NULL DEFAULT 'None',
                        [StopBits] nvarchar(max) NOT NULL DEFAULT 'One',
                        [Handshake] nvarchar(max) NOT NULL DEFAULT 'None',
                        [WatchFolderPath] nvarchar(260) NULL,
                        [WorklistMode] nvarchar(30) NOT NULL DEFAULT 'Unidirectional',
                        [IsActive] bit NOT NULL DEFAULT 1,
                        CONSTRAINT [PK_AnalyzerListeners] PRIMARY KEY ([AnalyzerListenerId])
                    );
                END
            ");

            // 3. Idempotently create PacsImportAuditLogs table
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PacsImportAuditLogs' AND type = 'U')
                BEGIN
                    CREATE TABLE [PacsImportAuditLogs] (
                        [AuditLogId] uniqueidentifier NOT NULL,
                        [RadiologyStudyId] uniqueidentifier NOT NULL,
                        [CreatedBy] uniqueidentifier NOT NULL,
                        [StudyInstanceUid] nvarchar(max) NOT NULL,
                        [ImportedAt] datetime2 NOT NULL,
                        [SeriesCount] int NOT NULL,
                        [ImagesImported] int NOT NULL,
                        [ImagesSkipped] int NOT NULL,
                        [WarningCount] int NOT NULL,
                        [WarningsJson] nvarchar(max) NULL,
                        [Status] nvarchar(max) NOT NULL,
                        [FailureReason] nvarchar(max) NULL,
                        [DurationMs] bigint NOT NULL,
                        CONSTRAINT [PK_PacsImportAuditLogs] PRIMARY KEY ([AuditLogId])
                    );
                    CREATE INDEX [IX_PacsImportAuditLogs_ImportedAt] ON [PacsImportAuditLogs] ([ImportedAt]);
                    CREATE INDEX [IX_PacsImportAuditLogs_RadiologyStudyId] ON [PacsImportAuditLogs] ([RadiologyStudyId]);
                END
            ");

            // 4. Idempotently create RadiologyModalities table and columns
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RadiologyModalities' AND type = 'U')
                BEGIN
                    CREATE TABLE [RadiologyModalities] (
                        [ModalityId] uniqueidentifier NOT NULL,
                        [BranchId] uniqueidentifier NOT NULL,
                        [Name] nvarchar(100) NOT NULL,
                        [ModalityType] nvarchar(20) NOT NULL,
                        [AeTitle] nvarchar(50) NOT NULL,
                        [HostIpAddress] nvarchar(50) NULL,
                        [Port] int NOT NULL DEFAULT 104,
                        [AllowCStore] bit NOT NULL DEFAULT 1,
                        [AllowMwl] bit NOT NULL DEFAULT 1,
                        [IsActive] bit NOT NULL DEFAULT 1,
                        [Notes] nvarchar(250) NULL,
                        [CreatedAt] datetimeoffset NOT NULL DEFAULT SYSDATETIMEOFFSET(),
                        [CreatedBy] uniqueidentifier NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
                        [UpdatedAt] datetimeoffset NULL,
                        [UpdatedBy] uniqueidentifier NULL,
                        CONSTRAINT [PK_RadiologyModalities] PRIMARY KEY ([ModalityId])
                    );
                END
                ELSE
                BEGIN
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RadiologyModalities') AND name = 'HostIpAddress')
                        ALTER TABLE [RadiologyModalities] ADD [HostIpAddress] nvarchar(50) NULL;
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RadiologyModalities') AND name = 'Port')
                        ALTER TABLE [RadiologyModalities] ADD [Port] int NOT NULL DEFAULT 104;
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RadiologyModalities') AND name = 'AllowCStore')
                        ALTER TABLE [RadiologyModalities] ADD [AllowCStore] bit NOT NULL DEFAULT 1;
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RadiologyModalities') AND name = 'AllowMwl')
                        ALTER TABLE [RadiologyModalities] ADD [AllowMwl] bit NOT NULL DEFAULT 1;
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RadiologyModalities') AND name = 'IsActive')
                        ALTER TABLE [RadiologyModalities] ADD [IsActive] bit NOT NULL DEFAULT 1;
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RadiologyModalities') AND name = 'Notes')
                        ALTER TABLE [RadiologyModalities] ADD [Notes] nvarchar(250) NULL;
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RadiologyModalities') AND name = 'CreatedBy')
                        ALTER TABLE [RadiologyModalities] ADD [CreatedBy] uniqueidentifier NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RadiologyModalities') AND name = 'UpdatedBy')
                        ALTER TABLE [RadiologyModalities] ADD [UpdatedBy] uniqueidentifier NULL;
                END
            ");

            // 5. Safely handle PacsSeries and PacsInstances indexes
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PacsSeries_RadiologyStudyId_StudyInstanceUid_SeriesInstanceUid' AND object_id = OBJECT_ID('PacsSeries'))
                BEGIN
                    DROP INDEX IX_PacsSeries_RadiologyStudyId_StudyInstanceUid_SeriesInstanceUid ON PacsSeries;
                END;

                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PacsSeries_RadiologyStudyId_SeriesInstanceUid' AND object_id = OBJECT_ID('PacsSeries'))
                BEGIN
                    CREATE UNIQUE INDEX [IX_PacsSeries_RadiologyStudyId_SeriesInstanceUid] ON [PacsSeries] ([RadiologyStudyId], [SeriesInstanceUid]);
                END;

                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PacsInstances_RadiologyStudyId_SopInstanceUid' AND object_id = OBJECT_ID('PacsInstances'))
                BEGIN
                    CREATE UNIQUE INDEX [IX_PacsInstances_RadiologyStudyId_SopInstanceUid] ON [PacsInstances] ([RadiologyStudyId], [SopInstanceUid]);
                END;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
