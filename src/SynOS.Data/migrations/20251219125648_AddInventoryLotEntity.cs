using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryLotEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IMS_InventoryLots",
                columns: table => new
                {
                    LotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BatchNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ContainerSize = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    CurrentQuantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    UnitCostSnapshot = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    ExpiryDate = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_InventoryLots", x => x.LotId);
                    table.ForeignKey(
                        name: "FK_IMS_InventoryLots_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_InventoryLots_IMS_Consumables_ItemId",
                        column: x => x.ItemId,
                        principalTable: "IMS_Consumables",
                        principalColumn: "ConsumableId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IMS_InventoryLots_BranchId",
                table: "IMS_InventoryLots",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_InventoryLots_ItemId_BranchId_BatchNumber",
                table: "IMS_InventoryLots",
                columns: new[] { "ItemId", "BranchId", "BatchNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IMS_InventoryLots");
        }
    }
}
