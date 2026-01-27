using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    public partial class CumulativeHardening : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. New Tables
            migrationBuilder.CreateTable(
                name: "CorrectionFacts",
                columns: table => new
                {
                    CorrectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CorrectionType = table.Column<int>(type: "int", nullable: false),
                    TargetEntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PreviousAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    NewAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CorrectionFacts", x => x.CorrectionId);
                });

            migrationBuilder.CreateTable(
                name: "PriceAdjustmentFacts",
                columns: table => new
                {
                    AdjustmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeltaAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceAdjustmentFacts", x => x.AdjustmentId);
                });

            // 2. Add Columns to Existing Tables
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SettledAt",
                table: "ReferralPayableFacts",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SettledAt",
                schema: "AR",
                table: "ReceivableFacts",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CancellationReason",
                table: "Orders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "Orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CancelledByUserId",
                table: "Orders",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "DiscountFacts",
                type: "bit",
                nullable: false,
                defaultValue: true); // Default true for existing

            migrationBuilder.AddColumn<decimal>(
                name: "MaxLimit",
                table: "DiscountFacts",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReplacedDiscountFactId",
                table: "DiscountFacts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "DiscountFacts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "Value",
                table: "DiscountFacts",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            // 3. Complex Alterations (Order Status) - Two Phase
            migrationBuilder.AddColumn<int>(
                name: "Status_Int",
                table: "Orders",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(@"
                UPDATE Orders SET Status_Int = 0 WHERE Status = 'Pending';
                UPDATE Orders SET Status_Int = 1 WHERE Status = 'Active';
                UPDATE Orders SET Status_Int = 2 WHERE Status = 'Cancelled';
                UPDATE Orders SET Status_Int = 3 WHERE Status = 'Collected';
                UPDATE Orders SET Status_Int = 4 WHERE Status = 'Completed';
                UPDATE Orders SET Status_Int = 0 WHERE Status NOT IN ('Pending', 'Active', 'Cancelled', 'Collected', 'Completed');
            ");

            migrationBuilder.DropColumn(name: "Status", table: "Orders");
            migrationBuilder.RenameColumn(name: "Status_Int", table: "Orders", newName: "Status");

            // 4. Alter Price Type (Decimal precision update)
            // Note: AlterColumn can be tricky if data exists, but decimal(10,2) -> decimal(12,2) is safe (widening).
            migrationBuilder.AlterColumn<decimal>(
                name: "Price",
                table: "Orders",
                type: "decimal(12,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(10,2)");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Minimal rollback logic (Dropping added columns/tables)
            migrationBuilder.DropTable(name: "CorrectionFacts");
            migrationBuilder.DropTable(name: "PriceAdjustmentFacts");
            migrationBuilder.DropColumn(name: "SettledAt", table: "ReferralPayableFacts");
            migrationBuilder.DropColumn(name: "SettledAt", schema: "AR", table: "ReceivableFacts");
            migrationBuilder.DropColumn(name: "CancellationReason", table: "Orders");
            migrationBuilder.DropColumn(name: "CancelledAt", table: "Orders");
            migrationBuilder.DropColumn(name: "CancelledByUserId", table: "Orders");
            migrationBuilder.DropColumn(name: "IsActive", table: "DiscountFacts");
            migrationBuilder.DropColumn(name: "MaxLimit", table: "DiscountFacts");
            migrationBuilder.DropColumn(name: "ReplacedDiscountFactId", table: "DiscountFacts");
            migrationBuilder.DropColumn(name: "Type", table: "DiscountFacts");
            migrationBuilder.DropColumn(name: "Value", table: "DiscountFacts");
            
            // Revert Status to string (Naive)
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Orders",
                type: "nvarchar(50)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");
        }
    }
}