using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReceivableFactsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "AR");

            migrationBuilder.CreateTable(
                name: "ReceivableFacts",
                schema: "AR",
                columns: table => new
                {
                    ReceivableFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourceVisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferralPartnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReceivableFacts", x => x.ReceivableFactId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReceivableFacts_ReferralPartnerId",
                schema: "AR",
                table: "ReceivableFacts",
                column: "ReferralPartnerId");

            migrationBuilder.CreateIndex(
                name: "IX_ReceivableFacts_SourceVisitId",
                schema: "AR",
                table: "ReceivableFacts",
                column: "SourceVisitId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReceivableFacts",
                schema: "AR");
        }
    }
}
