using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOperationalSettingsToLabProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BackupEncryptionKey",
                table: "LabProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiagnosticsEncryptionKey",
                table: "LabProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InventoryValuationMethod",
                table: "LabProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MiddlewareApiKey",
                table: "LabProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MiddlewareApiUrl",
                table: "LabProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PacsMaxInstancesPerSeriesInSeriesTree",
                table: "LabProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PacsMaxTotalInstancesPerStudyInSeriesTree",
                table: "LabProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "ReferralEconomicsEnabled",
                table: "LabProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BackupEncryptionKey",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "DiagnosticsEncryptionKey",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "InventoryValuationMethod",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "MiddlewareApiKey",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "MiddlewareApiUrl",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "PacsMaxInstancesPerSeriesInSeriesTree",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "PacsMaxTotalInstancesPerStudyInSeriesTree",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "ReferralEconomicsEnabled",
                table: "LabProfiles");
        }
    }
}
