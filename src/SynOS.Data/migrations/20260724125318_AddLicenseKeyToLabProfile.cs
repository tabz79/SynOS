using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLicenseKeyToLabProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LicenseKey",
                table: "LabProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "QuantityPerTest",
                table: "IMS_TestConsumableMaps",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<decimal>(
                name: "DisplayQuantity",
                table: "IMS_TestConsumableMaps",
                type: "decimal(18,4)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DisplayUnit",
                table: "IMS_TestConsumableMaps",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequestedFromScreen",
                table: "IMS_StockRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequesterRole",
                table: "IMS_StockRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Modality",
                table: "IMS_InventoryItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ServiceArea",
                table: "IMS_InventoryItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LicenseKey",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "DisplayQuantity",
                table: "IMS_TestConsumableMaps");

            migrationBuilder.DropColumn(
                name: "DisplayUnit",
                table: "IMS_TestConsumableMaps");

            migrationBuilder.DropColumn(
                name: "RequestedFromScreen",
                table: "IMS_StockRequests");

            migrationBuilder.DropColumn(
                name: "RequesterRole",
                table: "IMS_StockRequests");

            migrationBuilder.DropColumn(
                name: "Modality",
                table: "IMS_InventoryItems");

            migrationBuilder.DropColumn(
                name: "ServiceArea",
                table: "IMS_InventoryItems");

            migrationBuilder.AlterColumn<int>(
                name: "QuantityPerTest",
                table: "IMS_TestConsumableMaps",
                type: "int",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");
        }
    }
}
