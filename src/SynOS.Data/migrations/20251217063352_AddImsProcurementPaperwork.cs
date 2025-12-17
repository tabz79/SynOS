using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddImsProcurementPaperwork : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IMS_TubeConsumptions");

            migrationBuilder.DropTable(
                name: "IMS_TubeStocks");

            migrationBuilder.CreateTable(
                name: "IMS_Suppliers",
                columns: table => new
                {
                    SupplierId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ContactInfo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_Suppliers", x => x.SupplierId);
                });

            migrationBuilder.CreateTable(
                name: "IMS_PurchaseOrders",
                columns: table => new
                {
                    POId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SupplierId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_PurchaseOrders", x => x.POId);
                    table.ForeignKey(
                        name: "FK_IMS_PurchaseOrders_IMS_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "IMS_Suppliers",
                        principalColumn: "SupplierId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IMS_POItems",
                columns: table => new
                {
                    POItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    POId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderedQuantity = table.Column<int>(type: "int", nullable: false),
                    ReceivedQuantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    TaxRate = table.Column<decimal>(type: "decimal(5,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_POItems", x => x.POItemId);
                    table.ForeignKey(
                        name: "FK_IMS_POItems_IMS_PurchaseOrders_POId",
                        column: x => x.POId,
                        principalTable: "IMS_PurchaseOrders",
                        principalColumn: "POId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IMS_POItems_IMS_TubeMasters_TubeId",
                        column: x => x.TubeId,
                        principalTable: "IMS_TubeMasters",
                        principalColumn: "TubeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IMS_TubeLots",
                columns: table => new
                {
                    LotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LotNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ExpiryDate = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CurrentQuantity = table.Column<int>(type: "int", nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    POItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CostPerUnit = table.Column<decimal>(type: "decimal(10,2)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_TubeLots", x => x.LotId);
                    table.ForeignKey(
                        name: "FK_IMS_TubeLots_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_TubeLots_IMS_POItems_POItemId",
                        column: x => x.POItemId,
                        principalTable: "IMS_POItems",
                        principalColumn: "POItemId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_TubeLots_IMS_TubeMasters_TubeId",
                        column: x => x.TubeId,
                        principalTable: "IMS_TubeMasters",
                        principalColumn: "TubeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IMS_StockMovements",
                columns: table => new
                {
                    MovementId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    MovementType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ReferenceId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    MovedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MovedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_StockMovements", x => x.MovementId);
                    table.ForeignKey(
                        name: "FK_IMS_StockMovements_IMS_TubeLots_LotId",
                        column: x => x.LotId,
                        principalTable: "IMS_TubeLots",
                        principalColumn: "LotId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_StockMovements_IMS_TubeMasters_TubeId",
                        column: x => x.TubeId,
                        principalTable: "IMS_TubeMasters",
                        principalColumn: "TubeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_StockMovements_Users_MovedByUserId",
                        column: x => x.MovedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IMS_POItems_POId",
                table: "IMS_POItems",
                column: "POId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_POItems_TubeId",
                table: "IMS_POItems",
                column: "TubeId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_PurchaseOrders_SupplierId",
                table: "IMS_PurchaseOrders",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockMovements_LotId",
                table: "IMS_StockMovements",
                column: "LotId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockMovements_MovedByUserId",
                table: "IMS_StockMovements",
                column: "MovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockMovements_ReferenceId",
                table: "IMS_StockMovements",
                column: "ReferenceId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockMovements_TubeId",
                table: "IMS_StockMovements",
                column: "TubeId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_Suppliers_Name",
                table: "IMS_Suppliers",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeLots_BranchId",
                table: "IMS_TubeLots",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeLots_POItemId",
                table: "IMS_TubeLots",
                column: "POItemId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeLots_TubeId_BranchId_LotNumber",
                table: "IMS_TubeLots",
                columns: new[] { "TubeId", "BranchId", "LotNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IMS_StockMovements");

            migrationBuilder.DropTable(
                name: "IMS_TubeLots");

            migrationBuilder.DropTable(
                name: "IMS_POItems");

            migrationBuilder.DropTable(
                name: "IMS_PurchaseOrders");

            migrationBuilder.DropTable(
                name: "IMS_Suppliers");

            migrationBuilder.CreateTable(
                name: "IMS_TubeConsumptions",
                columns: table => new
                {
                    ConsumptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConsumedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConsumedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_TubeConsumptions", x => x.ConsumptionId);
                    table.ForeignKey(
                        name: "FK_IMS_TubeConsumptions_IMS_TubeMasters_TubeId",
                        column: x => x.TubeId,
                        principalTable: "IMS_TubeMasters",
                        principalColumn: "TubeId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IMS_TubeConsumptions_Samples_SampleId",
                        column: x => x.SampleId,
                        principalTable: "Samples",
                        principalColumn: "SampleId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_TubeConsumptions_Users_ConsumedByUserId",
                        column: x => x.ConsumedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IMS_TubeStocks",
                columns: table => new
                {
                    StockId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AlertQuantity = table.Column<int>(type: "int", nullable: false),
                    CurrentQuantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_TubeStocks", x => x.StockId);
                    table.ForeignKey(
                        name: "FK_IMS_TubeStocks_IMS_TubeMasters_TubeId",
                        column: x => x.TubeId,
                        principalTable: "IMS_TubeMasters",
                        principalColumn: "TubeId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeConsumptions_ConsumedByUserId",
                table: "IMS_TubeConsumptions",
                column: "ConsumedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeConsumptions_SampleId_TubeId",
                table: "IMS_TubeConsumptions",
                columns: new[] { "SampleId", "TubeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeConsumptions_TubeId",
                table: "IMS_TubeConsumptions",
                column: "TubeId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeStocks_TubeId",
                table: "IMS_TubeStocks",
                column: "TubeId",
                unique: true);
        }
    }
}
