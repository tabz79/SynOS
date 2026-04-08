using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReportLifecycleHardening : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent column additions
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Reports' AND COLUMN_NAME = 'DraftSnapshotJson')
                    ALTER TABLE Reports ADD DraftSnapshotJson nvarchar(max) NULL;
                
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Reports' AND COLUMN_NAME = 'FinalSnapshotJson')
                    ALTER TABLE Reports ADD FinalSnapshotJson nvarchar(max) NULL;
                
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Reports' AND COLUMN_NAME = 'TypedByUserId')
                    ALTER TABLE Reports ADD TypedByUserId uniqueidentifier NULL;

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Reports' AND COLUMN_NAME = 'UpdatedAt')
                    ALTER TABLE Reports ADD UpdatedAt datetimeoffset NULL;

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Reports' AND COLUMN_NAME = 'VerificationMode')
                    ALTER TABLE Reports ADD VerificationMode nvarchar(20) NOT NULL DEFAULT '';

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Reports' AND COLUMN_NAME = 'VerifiedAt')
                    ALTER TABLE Reports ADD VerifiedAt datetimeoffset NULL;

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Reports' AND COLUMN_NAME = 'VerifiedByUserId')
                    ALTER TABLE Reports ADD VerifiedByUserId uniqueidentifier NULL;
            ");

            // Idempotent index additions
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('Reports') AND name = 'IX_Reports_TypedByUserId')
                    CREATE INDEX IX_Reports_TypedByUserId ON Reports(TypedByUserId);

                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('Reports') AND name = 'IX_Reports_VerifiedByUserId')
                    CREATE INDEX IX_Reports_VerifiedByUserId ON Reports(VerifiedByUserId);
            ");

            // Idempotent foreign key additions
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Reports_Users_TypedByUserId')
                    ALTER TABLE Reports ADD CONSTRAINT FK_Reports_Users_TypedByUserId FOREIGN KEY (TypedByUserId) REFERENCES Users(UserId);

                IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Reports_Users_VerifiedByUserId')
                    ALTER TABLE Reports ADD CONSTRAINT FK_Reports_Users_VerifiedByUserId FOREIGN KEY (VerifiedByUserId) REFERENCES Users(UserId);
            ");

            // Seed existing data
            migrationBuilder.Sql("UPDATE Reports SET UpdatedAt = CreatedAt WHERE UpdatedAt IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reports_Users_TypedByUserId",
                table: "Reports");

            migrationBuilder.DropForeignKey(
                name: "FK_Reports_Users_VerifiedByUserId",
                table: "Reports");

            migrationBuilder.DropIndex(
                name: "IX_Reports_TypedByUserId",
                table: "Reports");

            migrationBuilder.DropIndex(
                name: "IX_Reports_VerifiedByUserId",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "DraftSnapshotJson",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "FinalSnapshotJson",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "TypedByUserId",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "VerificationMode",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "VerifiedAt",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "VerifiedByUserId",
                table: "Reports");
        }
    }
}
