using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddModalityMastersTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ModalityId",
                table: "Tests",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ModalityId",
                table: "ReportTemplates",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ModalityId",
                table: "RadiologyStudies",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "ModalityMasters",
                columns: table => new
                {
                    ModalityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModalityMasters", x => x.ModalityId);
                    table.ForeignKey(
                        name: "FK_ModalityMasters_DepartmentMasters_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "DepartmentMasters",
                        principalColumn: "DepartmentId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.Sql(@"
DECLARE @radDeptId UNIQUEIDENTIFIER;
SELECT TOP 1 @radDeptId = DepartmentId FROM DepartmentMasters WHERE Code = 'RAD';
IF @radDeptId IS NULL
BEGIN
    SET @radDeptId = 'f74c728e-5b12-4eb9-bf25-ccad1a770000';
    INSERT INTO DepartmentMasters (DepartmentId, Code, Name, MacroDepartment, IsActive, CreatedAt)
    VALUES (@radDeptId, 'RAD', 'Radiology', 'Radiology', 1, SYSDATETIMEOFFSET());
END

DECLARE @xrayGuid UNIQUEIDENTIFIER = 'e57c1d76-cb2a-46eb-8e9f-7b7891cb0001';
DECLARE @ctGuid UNIQUEIDENTIFIER = 'e57c1d76-cb2a-46eb-8e9f-7b7891cb0002';
DECLARE @mriGuid UNIQUEIDENTIFIER = 'e57c1d76-cb2a-46eb-8e9f-7b7891cb0003';
DECLARE @usGuid UNIQUEIDENTIFIER = 'e57c1d76-cb2a-46eb-8e9f-7b7891cb0004';

IF NOT EXISTS (SELECT 1 FROM ModalityMasters WHERE Code = 'XRAY')
    INSERT INTO ModalityMasters (ModalityId, Code, Name, DepartmentId, IsActive, CreatedAt)
    VALUES (@xrayGuid, 'XRAY', 'X-Ray', @radDeptId, 1, SYSDATETIMEOFFSET());

IF NOT EXISTS (SELECT 1 FROM ModalityMasters WHERE Code = 'CT')
    INSERT INTO ModalityMasters (ModalityId, Code, Name, DepartmentId, IsActive, CreatedAt)
    VALUES (@ctGuid, 'CT', 'CT Scan', @radDeptId, 1, SYSDATETIMEOFFSET());

IF NOT EXISTS (SELECT 1 FROM ModalityMasters WHERE Code = 'MRI')
    INSERT INTO ModalityMasters (ModalityId, Code, Name, DepartmentId, IsActive, CreatedAt)
    VALUES (@mriGuid, 'MRI', 'MRI', @radDeptId, 1, SYSDATETIMEOFFSET());

IF NOT EXISTS (SELECT 1 FROM ModalityMasters WHERE Code = 'US')
    INSERT INTO ModalityMasters (ModalityId, Code, Name, DepartmentId, IsActive, CreatedAt)
    VALUES (@usGuid, 'US', 'Ultrasound', @radDeptId, 1, SYSDATETIMEOFFSET());

SELECT TOP 1 @xrayGuid = ModalityId FROM ModalityMasters WHERE Code = 'XRAY';

UPDATE Tests SET ModalityId = @xrayGuid, Category = 'X-Ray', DepartmentId = @radDeptId
WHERE DepartmentId = '99f8d2bd-3b7c-4188-840a-2f647aad6454' OR TestCode IN ('ABD', 'AORTOGRAM');

UPDATE RadiologyStudies SET ModalityId = @xrayGuid, Modality = 'X-Ray'
WHERE ModalityId = '00000000-0000-0000-0000-000000000000' OR ModalityId IS NULL;
");

            migrationBuilder.CreateIndex(
                name: "IX_Tests_ModalityId",
                table: "Tests",
                column: "ModalityId");

            migrationBuilder.CreateIndex(
                name: "IX_ReportTemplates_ModalityId",
                table: "ReportTemplates",
                column: "ModalityId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyStudies_ModalityId",
                table: "RadiologyStudies",
                column: "ModalityId");

            migrationBuilder.CreateIndex(
                name: "IX_ModalityMasters_Code",
                table: "ModalityMasters",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ModalityMasters_DepartmentId",
                table: "ModalityMasters",
                column: "DepartmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_RadiologyStudies_ModalityMasters_ModalityId",
                table: "RadiologyStudies",
                column: "ModalityId",
                principalTable: "ModalityMasters",
                principalColumn: "ModalityId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ReportTemplates_ModalityMasters_ModalityId",
                table: "ReportTemplates",
                column: "ModalityId",
                principalTable: "ModalityMasters",
                principalColumn: "ModalityId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tests_ModalityMasters_ModalityId",
                table: "Tests",
                column: "ModalityId",
                principalTable: "ModalityMasters",
                principalColumn: "ModalityId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RadiologyStudies_ModalityMasters_ModalityId",
                table: "RadiologyStudies");

            migrationBuilder.DropForeignKey(
                name: "FK_ReportTemplates_ModalityMasters_ModalityId",
                table: "ReportTemplates");

            migrationBuilder.DropForeignKey(
                name: "FK_Tests_ModalityMasters_ModalityId",
                table: "Tests");

            migrationBuilder.DropTable(
                name: "ModalityMasters");

            migrationBuilder.DropIndex(
                name: "IX_Tests_ModalityId",
                table: "Tests");

            migrationBuilder.DropIndex(
                name: "IX_ReportTemplates_ModalityId",
                table: "ReportTemplates");

            migrationBuilder.DropIndex(
                name: "IX_RadiologyStudies_ModalityId",
                table: "RadiologyStudies");

            migrationBuilder.DropColumn(
                name: "ModalityId",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "ModalityId",
                table: "ReportTemplates");

            migrationBuilder.DropColumn(
                name: "ModalityId",
                table: "RadiologyStudies");
        }
    }
}
