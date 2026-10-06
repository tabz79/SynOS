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
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LabProfiles') AND name = 'LicenseKey')
                BEGIN
                    ALTER TABLE [LabProfiles] ADD [LicenseKey] nvarchar(max) NULL;
                END

                IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IMS_TestConsumableMaps') AND name = 'QuantityPerTest' AND system_type_id = 56)
                BEGIN
                    ALTER TABLE [IMS_TestConsumableMaps] ALTER COLUMN [QuantityPerTest] decimal(18,4) NOT NULL;
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IMS_TestConsumableMaps') AND name = 'DisplayQuantity')
                BEGIN
                    ALTER TABLE [IMS_TestConsumableMaps] ADD [DisplayQuantity] decimal(18,4) NULL;
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IMS_TestConsumableMaps') AND name = 'DisplayUnit')
                BEGIN
                    ALTER TABLE [IMS_TestConsumableMaps] ADD [DisplayUnit] nvarchar(50) NULL;
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IMS_StockRequests') AND name = 'RequestedFromScreen')
                BEGIN
                    ALTER TABLE [IMS_StockRequests] ADD [RequestedFromScreen] nvarchar(100) NULL;
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IMS_StockRequests') AND name = 'RequesterRole')
                BEGIN
                    ALTER TABLE [IMS_StockRequests] ADD [RequesterRole] nvarchar(100) NULL;
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IMS_InventoryItems') AND name = 'Modality')
                BEGIN
                    ALTER TABLE [IMS_InventoryItems] ADD [Modality] nvarchar(100) NULL;
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IMS_InventoryItems') AND name = 'ServiceArea')
                BEGIN
                    ALTER TABLE [IMS_InventoryItems] ADD [ServiceArea] nvarchar(100) NOT NULL DEFAULT '';
                END
            ");
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
