using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchIdToReportTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "ReportTemplates",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SeriesInstanceUid",
                table: "RadiologyImages",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SopInstanceUid",
                table: "RadiologyImages",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudyInstanceUid",
                table: "RadiologyImages",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReportTemplates_BranchId",
                table: "ReportTemplates",
                column: "BranchId");

            migrationBuilder.AddForeignKey(
                name: "FK_ReportTemplates_Branches_BranchId",
                table: "ReportTemplates",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "BranchId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReportTemplates_Branches_BranchId",
                table: "ReportTemplates");

            migrationBuilder.DropIndex(
                name: "IX_ReportTemplates_BranchId",
                table: "ReportTemplates");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "ReportTemplates");

            migrationBuilder.DropColumn(
                name: "SeriesInstanceUid",
                table: "RadiologyImages");

            migrationBuilder.DropColumn(
                name: "SopInstanceUid",
                table: "RadiologyImages");

            migrationBuilder.DropColumn(
                name: "StudyInstanceUid",
                table: "RadiologyImages");
        }
    }
}
