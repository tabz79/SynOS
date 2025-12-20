using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReparentInventoryLotToItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IMS_InventoryLots_IMS_Consumables_ItemId",
                table: "IMS_InventoryLots");

            migrationBuilder.DropIndex(
                name: "IX_IMS_InventoryLots_ItemId_BranchId_BatchNumber",
                table: "IMS_InventoryLots");

            migrationBuilder.AlterColumn<Guid>(
                name: "ItemId",
                table: "IMS_InventoryLots",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.CreateTable(
                name: "IMS_InventoryItems",
                columns: table => new
                {
                    ItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ItemCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_InventoryItems", x => x.ItemId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IMS_InventoryLots_ItemId_BranchId_BatchNumber",
                table: "IMS_InventoryLots",
                columns: new[] { "ItemId", "BranchId", "BatchNumber" },
                unique: true,
                filter: "[ItemId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_InventoryItems_ItemCode",
                table: "IMS_InventoryItems",
                column: "ItemCode",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_IMS_InventoryLots_IMS_InventoryItems_ItemId",
                table: "IMS_InventoryLots",
                column: "ItemId",
                principalTable: "IMS_InventoryItems",
                principalColumn: "ItemId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IMS_InventoryLots_IMS_InventoryItems_ItemId",
                table: "IMS_InventoryLots");

            migrationBuilder.DropTable(
                name: "IMS_InventoryItems");

            migrationBuilder.DropIndex(
                name: "IX_IMS_InventoryLots_ItemId_BranchId_BatchNumber",
                table: "IMS_InventoryLots");

            migrationBuilder.AlterColumn<Guid>(
                name: "ItemId",
                table: "IMS_InventoryLots",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMS_InventoryLots_ItemId_BranchId_BatchNumber",
                table: "IMS_InventoryLots",
                columns: new[] { "ItemId", "BranchId", "BatchNumber" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_IMS_InventoryLots_IMS_Consumables_ItemId",
                table: "IMS_InventoryLots",
                column: "ItemId",
                principalTable: "IMS_Consumables",
                principalColumn: "ConsumableId",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
