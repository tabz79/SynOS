using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReportTemplatePersist : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ReportTemplateId",
                table: "Tests",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReportTemplateId",
                table: "Reports",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tests_ReportTemplateId",
                table: "Tests",
                column: "ReportTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_ReportTemplateId",
                table: "Reports",
                column: "ReportTemplateId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reports_ReportTemplates_ReportTemplateId",
                table: "Reports",
                column: "ReportTemplateId",
                principalTable: "ReportTemplates",
                principalColumn: "TemplateId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tests_ReportTemplates_ReportTemplateId",
                table: "Tests",
                column: "ReportTemplateId",
                principalTable: "ReportTemplates",
                principalColumn: "TemplateId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reports_ReportTemplates_ReportTemplateId",
                table: "Reports");

            migrationBuilder.DropForeignKey(
                name: "FK_Tests_ReportTemplates_ReportTemplateId",
                table: "Tests");

            migrationBuilder.DropIndex(
                name: "IX_Tests_ReportTemplateId",
                table: "Tests");

            migrationBuilder.DropIndex(
                name: "IX_Reports_ReportTemplateId",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "ReportTemplateId",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "ReportTemplateId",
                table: "Reports");
        }
    }
}
