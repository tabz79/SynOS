using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    public partial class CanonicalSeparation : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeltaAmount",
                table: "CorrectionFacts");

            migrationBuilder.DropColumn(
                name: "FinancialRole",
                table: "CorrectionFacts");

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

            migrationBuilder.CreateIndex(
                name: "IX_PriceAdjustmentFacts_InvoiceId",
                table: "PriceAdjustmentFacts",
                column: "InvoiceId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PriceAdjustmentFacts");

            migrationBuilder.AddColumn<decimal>(
                name: "DeltaAmount",
                table: "CorrectionFacts",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "FinancialRole",
                table: "CorrectionFacts",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
