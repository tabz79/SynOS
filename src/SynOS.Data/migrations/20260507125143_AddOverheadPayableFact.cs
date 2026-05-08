using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOverheadPayableFact : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // migrationBuilder.AddColumn<string>(
            //     name: "Category",
            //     table: "SpendFacts",
            //     type: "nvarchar(max)",
            //     nullable: false,
            //     defaultValue: "");

            // migrationBuilder.AddColumn<decimal>(
            //     name: "AmountPaid",
            //     table: "ReferralPayableFacts",
            //     type: "decimal(18,2)",
            //     nullable: false,
            //     defaultValue: 0m);

            // migrationBuilder.AddColumn<bool>(
            //     name: "AllowCommissionOnOutsourcedTests",
            //     table: "ReferralCommissionRules",
            //     type: "bit",
            //     nullable: false,
            //     defaultValue: false);

            // migrationBuilder.AddColumn<decimal>(
            //     name: "AmountReceived",
            //     schema: "AR",
            //     table: "ReceivableFacts",
            //     type: "decimal(18,2)",
            //     nullable: false,
            //     defaultValue: 0m);

            // migrationBuilder.AddColumn<decimal>(
            //     name: "BaseAmount",
            //     table: "PayStructureComponents",
            //     type: "decimal(18,2)",
            //     nullable: false,
            //     defaultValue: 0m);

            // migrationBuilder.AddColumn<bool>(
            //     name: "IsOutsourced",
            //     table: "Orders",
            //     type: "bit",
            //     nullable: false,
            //     defaultValue: false);

            // migrationBuilder.AddColumn<DateTime>(
            //     name: "OutsourcedAt",
            //     table: "Orders",
            //     type: "datetime2",
            //     nullable: true);

            // migrationBuilder.AddColumn<string>(
            //     name: "ReferenceLabName",
            //     table: "Orders",
            //     type: "nvarchar(200)",
            //     maxLength: 200,
            //     nullable: true);

            // migrationBuilder.AddColumn<Guid>(
            //     name: "InventoryLotId",
            //     table: "IMS_StockMovements",
            //     type: "uniqueidentifier",
            //     nullable: true);

            // migrationBuilder.AddColumn<string>(
            //     name: "AccuracyFlag",
            //     table: "CostAttribution_UsageFacts",
            //     type: "nvarchar(50)",
            //     maxLength: 50,
            //     nullable: true);

            // migrationBuilder.AddColumn<decimal>(
            //     name: "TotalCost",
            //     table: "CostAttribution_UsageFacts",
            //     type: "decimal(18,4)",
            //     nullable: true);

            // migrationBuilder.AddColumn<decimal>(
            //     name: "UnitCost",
            //     table: "CostAttribution_UsageFacts",
            //     type: "decimal(18,4)",
            //     nullable: true);

            migrationBuilder.CreateTable(
                name: "OverheadExpenses",
                schema: "Payables",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Category = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ExpenseDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OverheadExpenses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OverheadPayableFacts",
                schema: "Payables",
                columns: table => new
                {
                    OverheadPayableId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Category = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    AmountDue = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    AmountPaid = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SettledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OverheadPayableFacts", x => x.OverheadPayableId);
                });

            migrationBuilder.CreateTable(
                name: "ReferenceLabPayables",
                schema: "Payables",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferenceLabName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ReferenceLabId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AmountDue = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    AmountPaid = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SettledAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferenceLabPayables", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VendorPayables",
                schema: "Payables",
                columns: table => new
                {
                    VendorPayableId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VendorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    VendorName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    AmountPaid = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ReferenceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReferenceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<int>(type: "int", maxLength: 20, nullable: false),
                    SettledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VendorPayables", x => x.VendorPayableId);
                });

            // migrationBuilder.CreateIndex(
            //     name: "IX_IMS_StockMovements_InventoryLotId",
            //     table: "IMS_StockMovements",
            //     column: "InventoryLotId");

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceLabPayables_PatientId",
                schema: "Payables",
                table: "ReferenceLabPayables",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceLabPayables_TestId",
                schema: "Payables",
                table: "ReferenceLabPayables",
                column: "TestId");

            migrationBuilder.CreateIndex(
                name: "IX_VendorPayables_ReferenceId",
                schema: "Payables",
                table: "VendorPayables",
                column: "ReferenceId");

            migrationBuilder.CreateIndex(
                name: "IX_VendorPayables_VendorId",
                schema: "Payables",
                table: "VendorPayables",
                column: "VendorId");

            // migrationBuilder.AddForeignKey(
            //     name: "FK_IMS_StockMovements_IMS_InventoryLots_InventoryLotId",
            //     table: "IMS_StockMovements",
            //     column: "InventoryLotId",
            //     principalTable: "IMS_InventoryLots",
            //     principalColumn: "LotId",
            //     onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // migrationBuilder.DropForeignKey(
            //     name: "FK_IMS_StockMovements_IMS_InventoryLots_InventoryLotId",
            //     table: "IMS_StockMovements");

            migrationBuilder.DropTable(
                name: "OverheadExpenses",
                schema: "Payables");

            migrationBuilder.DropTable(
                name: "OverheadPayableFacts",
                schema: "Payables");

            migrationBuilder.DropTable(
                name: "ReferenceLabPayables",
                schema: "Payables");

            migrationBuilder.DropTable(
                name: "VendorPayables",
                schema: "Payables");

            // migrationBuilder.DropIndex(
            //     name: "IX_IMS_StockMovements_InventoryLotId",
            //     table: "IMS_StockMovements");

            // migrationBuilder.DropColumn(
            //     name: "Category",
            //     table: "SpendFacts");

            // migrationBuilder.DropColumn(
            //     name: "AmountPaid",
            //     table: "ReferralPayableFacts");

            // migrationBuilder.DropColumn(
            //     name: "AllowCommissionOnOutsourcedTests",
            //     table: "ReferralCommissionRules");

            // migrationBuilder.DropColumn(
            //     name: "AmountReceived",
            //     schema: "AR",
            //     table: "ReceivableFacts");

            // migrationBuilder.DropColumn(
            //     name: "BaseAmount",
            //     table: "PayStructureComponents");

            // migrationBuilder.DropColumn(
            //     name: "IsOutsourced",
            //     table: "Orders");

            // migrationBuilder.DropColumn(
            //     name: "OutsourcedAt",
            //     table: "Orders");

            // migrationBuilder.DropColumn(
            //     name: "ReferenceLabName",
            //     table: "Orders");

            // migrationBuilder.DropColumn(
            //     name: "InventoryLotId",
            //     table: "IMS_StockMovements");

            // migrationBuilder.DropColumn(
            //     name: "AccuracyFlag",
            //     table: "CostAttribution_UsageFacts");

            // migrationBuilder.DropColumn(
            //     name: "TotalCost",
            //     table: "CostAttribution_UsageFacts");

            // migrationBuilder.DropColumn(
            //     name: "UnitCost",
            //     table: "CostAttribution_UsageFacts");
        }
    }
}
