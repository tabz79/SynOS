using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRevenueEngineSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PaymentConfirmedFacts",
                columns: table => new
                {
                    PaymentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Direction = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    CounterpartyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferenceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Channel = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentConfirmedFacts", x => x.PaymentId);
                });

            migrationBuilder.CreateTable(
                name: "RevenueFacts",
                columns: table => new
                {
                    RevenueFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    DeclaredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Direction = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SourceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SourceReferenceId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PaymentMode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DeclaredByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExternalTransactionId = table.Column<string>(type: "nvarchar(450)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RevenueFacts", x => x.RevenueFactId);
                });

            migrationBuilder.CreateTable(
                name: "SpendFacts",
                columns: table => new
                {
                    SpendFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Account = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Channel = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SupplierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ObligationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PayrollRunId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ExternalReference = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpendFacts", x => x.SpendFactId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RevenueFacts_ExternalTransactionId",
                table: "RevenueFacts",
                column: "ExternalTransactionId",
                unique: true,
                filter: "[ExternalTransactionId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentConfirmedFacts");

            migrationBuilder.DropTable(
                name: "RevenueFacts");

            migrationBuilder.DropTable(
                name: "SpendFacts");
        }
    }
}
