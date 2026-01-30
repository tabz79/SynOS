using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFinancialStats : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PaymentsCashTotal",
                table: "UserOperationalStats",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "PaymentsOnlineCount",
                table: "UserOperationalStats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "PaymentsOnlineTotal",
                table: "UserOperationalStats",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "PrepaidBillsCount",
                table: "UserOperationalStats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "PrepaidBillsTotal",
                table: "UserOperationalStats",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            /* 
            // TABLE EXISTS MANUALLY - SKIPPING CREATION
            migrationBuilder.CreateTable(
                name: "PaymentConfirmedFacts",
                columns: table => new
                {
                    PaymentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Direction = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CounterpartyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferenceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Channel = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentConfirmedFacts", x => x.PaymentId);
                });
            */
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentConfirmedFacts");

            migrationBuilder.DropColumn(
                name: "PaymentsCashTotal",
                table: "UserOperationalStats");

            migrationBuilder.DropColumn(
                name: "PaymentsOnlineCount",
                table: "UserOperationalStats");

            migrationBuilder.DropColumn(
                name: "PaymentsOnlineTotal",
                table: "UserOperationalStats");

            migrationBuilder.DropColumn(
                name: "PrepaidBillsCount",
                table: "UserOperationalStats");

            migrationBuilder.DropColumn(
                name: "PrepaidBillsTotal",
                table: "UserOperationalStats");
        }
    }
}
