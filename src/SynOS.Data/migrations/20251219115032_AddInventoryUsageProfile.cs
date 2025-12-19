using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryUsageProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IMS_InventoryUsageProfiles",
                columns: table => new
                {
                    ConsumableId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ItemType = table.Column<int>(type: "int", nullable: false),
                    ConsumptionBasis = table.Column<int>(type: "int", nullable: false),
                    DefaultQuantityPerEvent = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    QuantityUnit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AllowsFractionalConsumption = table.Column<bool>(type: "bit", nullable: false),
                    RequiresLotTracking = table.Column<bool>(type: "bit", nullable: false),
                    AffectsTestCost = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_InventoryUsageProfiles", x => x.ConsumableId);
                    table.ForeignKey(
                        name: "FK_IMS_InventoryUsageProfiles_IMS_Consumables_ConsumableId",
                        column: x => x.ConsumableId,
                        principalTable: "IMS_Consumables",
                        principalColumn: "ConsumableId",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IMS_InventoryUsageProfiles");
        }
    }
}
