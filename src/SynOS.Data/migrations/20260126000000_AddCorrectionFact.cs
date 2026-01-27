using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    public partial class AddCorrectionFact : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CorrectionFacts",
                columns: table => new
                {
                    CorrectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CorrectionType = table.Column<int>(type: "int", nullable: false),
                    TargetEntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeltaAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PreviousAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    NewAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsReversal = table.Column<bool>(type: "bit", nullable: false),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CorrectionFacts", x => x.CorrectionId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CorrectionFacts_InvoiceId",
                table: "CorrectionFacts",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_CorrectionFacts_VisitId",
                table: "CorrectionFacts",
                column: "VisitId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CorrectionFacts");
        }
    }
}
