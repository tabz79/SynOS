using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddImsRequestSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LowStockThreshold",
                table: "IMS_Consumables",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "IMS_RoleItemMaps",
                columns: table => new
                {
                    MapId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConsumableId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_RoleItemMaps", x => x.MapId);
                    table.ForeignKey(
                        name: "FK_IMS_RoleItemMaps_IMS_Consumables_ConsumableId",
                        column: x => x.ConsumableId,
                        principalTable: "IMS_Consumables",
                        principalColumn: "ConsumableId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IMS_RoleItemMaps_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "RoleId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IMS_StockRequests",
                columns: table => new
                {
                    RequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConsumableId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    RequestedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    FulfilledByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FulfilledAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_StockRequests", x => x.RequestId);
                    table.ForeignKey(
                        name: "FK_IMS_StockRequests_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IMS_StockRequests_IMS_Consumables_ConsumableId",
                        column: x => x.ConsumableId,
                        principalTable: "IMS_Consumables",
                        principalColumn: "ConsumableId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IMS_StockRequests_Users_FulfilledByUserId",
                        column: x => x.FulfilledByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_StockRequests_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IMS_RoleItemMaps_ConsumableId",
                table: "IMS_RoleItemMaps",
                column: "ConsumableId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_RoleItemMaps_RoleId_ConsumableId",
                table: "IMS_RoleItemMaps",
                columns: new[] { "RoleId", "ConsumableId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockRequests_BranchId",
                table: "IMS_StockRequests",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockRequests_ConsumableId",
                table: "IMS_StockRequests",
                column: "ConsumableId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockRequests_FulfilledByUserId",
                table: "IMS_StockRequests",
                column: "FulfilledByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockRequests_RequestedByUserId",
                table: "IMS_StockRequests",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockRequests_Status",
                table: "IMS_StockRequests",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IMS_RoleItemMaps");

            migrationBuilder.DropTable(
                name: "IMS_StockRequests");

            migrationBuilder.DropColumn(
                name: "LowStockThreshold",
                table: "IMS_Consumables");
        }
    }
}
