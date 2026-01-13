using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReferralPayableFact : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SpendLineItemFacts",
                schema: "Spend");

            migrationBuilder.DropColumn(
                name: "EmployeeId",
                table: "SpendFacts");

            migrationBuilder.DropColumn(
                name: "ExternalReference",
                table: "SpendFacts");

            migrationBuilder.DropColumn(
                name: "InvoiceId",
                table: "SpendFacts");

            migrationBuilder.DropColumn(
                name: "ObligationId",
                table: "SpendFacts");

            migrationBuilder.DropColumn(
                name: "SupplierId",
                table: "SpendFacts");

            migrationBuilder.AlterColumn<DateTime>(
                name: "RecordedAt",
                table: "SpendFacts",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "datetimeoffset");

            migrationBuilder.AlterColumn<Guid>(
                name: "PayrollRunId",
                table: "SpendFacts",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "OccurredAt",
                table: "SpendFacts",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "datetimeoffset");

            migrationBuilder.AddColumn<Guid>(
                name: "PayeeId",
                table: "SpendFacts",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "PaymentAttemptId",
                table: "SpendFacts",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "PaymentBatchId",
                table: "SpendFacts",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<int>(
                name: "PaymentMethod",
                table: "SpendFacts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "TransactionReference",
                table: "SpendFacts",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "ReferralPayableFacts",
                columns: table => new
                {
                    ReferralPayableFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferralPartnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SourceVisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RecordedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferralPayableFacts", x => x.ReferralPayableFactId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SpendFacts_TransactionReference",
                table: "SpendFacts",
                column: "TransactionReference",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReferralPayableFacts");

            migrationBuilder.DropIndex(
                name: "IX_SpendFacts_TransactionReference",
                table: "SpendFacts");

            migrationBuilder.DropColumn(
                name: "PayeeId",
                table: "SpendFacts");

            migrationBuilder.DropColumn(
                name: "PaymentAttemptId",
                table: "SpendFacts");

            migrationBuilder.DropColumn(
                name: "PaymentBatchId",
                table: "SpendFacts");

            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                table: "SpendFacts");

            migrationBuilder.DropColumn(
                name: "TransactionReference",
                table: "SpendFacts");

            migrationBuilder.EnsureSchema(
                name: "Spend");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "RecordedAt",
                table: "SpendFacts",
                type: "datetimeoffset",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<Guid>(
                name: "PayrollRunId",
                table: "SpendFacts",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "OccurredAt",
                table: "SpendFacts",
                type: "datetimeoffset",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<Guid>(
                name: "EmployeeId",
                table: "SpendFacts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalReference",
                table: "SpendFacts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "InvoiceId",
                table: "SpendFacts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ObligationId",
                table: "SpendFacts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SupplierId",
                table: "SpendFacts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SpendLineItemFacts",
                schema: "Spend",
                columns: table => new
                {
                    SpendLineItemFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    PurchaseOrderItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    SpendFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,4)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpendLineItemFacts", x => x.SpendLineItemFactId);
                });
        }
    }
}
