using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOperationalAndOtaSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "JwtExpiryMinutes",
                table: "LabProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "JwtRefreshTokenExpiryDays",
                table: "LabProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "MaintenanceDay",
                table: "LabProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MaintenanceEndHour",
                table: "LabProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MaintenanceStartHour",
                table: "LabProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OtaChannel",
                table: "LabProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OtaPolicy",
                table: "LabProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReportStorageFolder",
                table: "LabProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkingDirectory",
                table: "LabProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AnalyzerListeners",
                columns: table => new
                {
                    AnalyzerListenerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyzerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Protocol = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Port = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnalyzerListeners", x => x.AnalyzerListenerId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnalyzerListeners");

            migrationBuilder.DropColumn(
                name: "JwtExpiryMinutes",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "JwtRefreshTokenExpiryDays",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "MaintenanceDay",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "MaintenanceEndHour",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "MaintenanceStartHour",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "OtaChannel",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "OtaPolicy",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "ReportStorageFolder",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "WorkingDirectory",
                table: "LabProfiles");
        }
    }
}
