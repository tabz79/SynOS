using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReportingMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsOverridden",
                table: "Results",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "OverrideReason",
                table: "Results",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Catalog_TubeTypes",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Catalog_TubeTypes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Catalog_Tests",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Catalog_Tests",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Catalog_SpecimenTypes",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Catalog_SpecimenTypes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Catalog_ServiceCategories",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Catalog_ServiceCategories",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Catalog_ProcessingDepartments",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Catalog_ProcessingDepartments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Catalog_Parameters",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<int>(
                name: "DecimalPlaces",
                table: "Catalog_Parameters",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "DisplayGroup",
                table: "Catalog_Parameters",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DisplayGroupOrder",
                table: "Catalog_Parameters",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsCalculated",
                table: "Catalog_Parameters",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Methodology",
                table: "Catalog_Parameters",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrintName",
                table: "Catalog_Parameters",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Catalog_Parameters",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CatalogTestNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NoteType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NoteText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogTestNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CatalogTestNotes_Catalog_Tests_TestCode",
                        column: x => x.TestCode,
                        principalTable: "Catalog_Tests",
                        principalColumn: "TestCode",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReportSnapshots",
                columns: table => new
                {
                    ReportVersionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SnapshotJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportSnapshots", x => x.ReportVersionId);
                    table.ForeignKey(
                        name: "FK_ReportSnapshots_ReportVersions_ReportVersionId",
                        column: x => x.ReportVersionId,
                        principalTable: "ReportVersions",
                        principalColumn: "ReportVersionId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CatalogTestNotes_TestCode_NoteType",
                table: "CatalogTestNotes",
                columns: new[] { "TestCode", "NoteType" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CatalogTestNotes");

            migrationBuilder.DropTable(
                name: "ReportSnapshots");

            migrationBuilder.DropColumn(
                name: "IsOverridden",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "OverrideReason",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Catalog_TubeTypes");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Catalog_TubeTypes");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Catalog_Tests");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Catalog_Tests");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Catalog_SpecimenTypes");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Catalog_SpecimenTypes");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Catalog_ServiceCategories");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Catalog_ServiceCategories");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Catalog_ProcessingDepartments");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Catalog_ProcessingDepartments");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Catalog_Parameters");

            migrationBuilder.DropColumn(
                name: "DecimalPlaces",
                table: "Catalog_Parameters");

            migrationBuilder.DropColumn(
                name: "DisplayGroup",
                table: "Catalog_Parameters");

            migrationBuilder.DropColumn(
                name: "DisplayGroupOrder",
                table: "Catalog_Parameters");

            migrationBuilder.DropColumn(
                name: "IsCalculated",
                table: "Catalog_Parameters");

            migrationBuilder.DropColumn(
                name: "Methodology",
                table: "Catalog_Parameters");

            migrationBuilder.DropColumn(
                name: "PrintName",
                table: "Catalog_Parameters");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Catalog_Parameters");
        }
    }
}
