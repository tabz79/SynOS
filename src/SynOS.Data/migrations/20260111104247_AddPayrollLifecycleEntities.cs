using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPayrollLifecycleEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RunType",
                table: "PayrollRuns");

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "PayrollRuns",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "PayrollRuns",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "ProvisionalResultData",
                table: "PayrollRuns",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "PayrollRuns");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "PayrollRuns");

            migrationBuilder.DropColumn(
                name: "ProvisionalResultData",
                table: "PayrollRuns");

            migrationBuilder.AddColumn<int>(
                name: "RunType",
                table: "PayrollRuns",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
