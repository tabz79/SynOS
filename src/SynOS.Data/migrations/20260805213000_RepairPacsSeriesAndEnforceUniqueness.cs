using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <summary>
    /// Migration to repair existing duplicate PacsSeries rows and enforce unique constraints on PacsSeries and PacsInstances tables.
    /// </summary>
    public partial class RepairPacsSeriesAndEnforceUniqueness : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Create PacsImportAuditLogs Table
            migrationBuilder.CreateTable(
                name: "PacsImportAuditLogs",
                columns: table => new
                {
                    AuditLogId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RadiologyStudyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudyInstanceUid = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ImportedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SeriesCount = table.Column<int>(type: "int", nullable: false),
                    ImagesImported = table.Column<int>(type: "int", nullable: false),
                    ImagesSkipped = table.Column<int>(type: "int", nullable: false),
                    WarningCount = table.Column<int>(type: "int", nullable: false),
                    WarningsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FailureReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DurationMs = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PacsImportAuditLogs", x => x.AuditLogId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PacsImportAuditLogs_ImportedAt",
                table: "PacsImportAuditLogs",
                column: "ImportedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PacsImportAuditLogs_RadiologyStudyId",
                table: "PacsImportAuditLogs",
                column: "RadiologyStudyId");

            // 2. One-Time Data Repair for Legacy Duplicate PacsSeries
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM sys.tables WHERE name = 'PacsSeries')
                BEGIN
                    WITH DuplicateSeries AS (
                        SELECT SeriesId, RadiologyStudyId, SeriesInstanceUid,
                               ROW_NUMBER() OVER (
                                   PARTITION BY RadiologyStudyId, SeriesInstanceUid 
                                   ORDER BY SeriesNumber ASC, SeriesId ASC
                               ) as RowNum
                        FROM PacsSeries
                    )
                    SELECT SeriesId, RadiologyStudyId, SeriesInstanceUid
                    INTO #SeriesToDelete
                    FROM DuplicateSeries WHERE RowNum > 1;

                    IF EXISTS (SELECT * FROM #SeriesToDelete)
                    BEGIN
                        UPDATE i
                        SET i.SeriesId = survivor.SeriesId
                        FROM PacsInstances i
                        JOIN PacsSeries dup ON i.SeriesId = dup.SeriesId
                        JOIN (
                            SELECT RadiologyStudyId, SeriesInstanceUid, MIN(SeriesId) as SeriesId
                            FROM PacsSeries
                            GROUP BY RadiologyStudyId, SeriesInstanceUid
                        ) survivor ON dup.RadiologyStudyId = survivor.RadiologyStudyId 
                                  AND dup.SeriesInstanceUid = survivor.SeriesInstanceUid
                        WHERE dup.SeriesId IN (SELECT SeriesId FROM #SeriesToDelete);

                        DELETE FROM PacsSeries WHERE SeriesId IN (SELECT SeriesId FROM #SeriesToDelete);
                    END;

                    IF OBJECT_ID('tempdb..#SeriesToDelete') IS NOT NULL
                        DROP TABLE #SeriesToDelete;
                END;
            ");

            // 3. Drop Old Non-Unique Index on PacsSeries if it exists
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PacsSeries_RadiologyStudyId_StudyInstanceUid_SeriesInstanceUid' AND object_id = OBJECT_ID('PacsSeries'))
                BEGIN
                    DROP INDEX IX_PacsSeries_RadiologyStudyId_StudyInstanceUid_SeriesInstanceUid ON PacsSeries;
                END;
            ");

            // 4. Create Unique Indexes on PacsSeries and PacsInstances
            migrationBuilder.CreateIndex(
                name: "IX_PacsSeries_RadiologyStudyId_SeriesInstanceUid",
                table: "PacsSeries",
                columns: new[] { "RadiologyStudyId", "SeriesInstanceUid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PacsInstances_RadiologyStudyId_SopInstanceUid",
                table: "PacsInstances",
                columns: new[] { "RadiologyStudyId", "SopInstanceUid" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "PacsImportAuditLogs");
            migrationBuilder.DropIndex(name: "IX_PacsSeries_RadiologyStudyId_SeriesInstanceUid", table: "PacsSeries");
            migrationBuilder.DropIndex(name: "IX_PacsInstances_RadiologyStudyId_SopInstanceUid", table: "PacsInstances");
        }
    }
}
