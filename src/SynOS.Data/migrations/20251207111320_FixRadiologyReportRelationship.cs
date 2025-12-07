using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixRadiologyReportRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reports_RadiologyReports_RadiologyReportReportId",
                table: "Reports");

            migrationBuilder.DropIndex(
                name: "IX_Reports_RadiologyReportReportId",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "RadiologyReportReportId",
                table: "Reports");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "RadiologyReportReportId",
                table: "Reports",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reports_RadiologyReportReportId",
                table: "Reports",
                column: "RadiologyReportReportId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reports_RadiologyReports_RadiologyReportReportId",
                table: "Reports",
                column: "RadiologyReportReportId",
                principalTable: "RadiologyReports",
                principalColumn: "ReportId");
        }
    }
}
