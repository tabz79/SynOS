using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCostAttributionFact : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CostAttribution_UsageFacts",
                columns: table => new
                {
                    UsageFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InventoryItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    SourceEventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourceEventType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CorrectsUsageFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CorrectionReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CostAttribution_UsageFacts", x => x.UsageFactId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CostAttribution_UsageFacts_InventoryItemId",
                table: "CostAttribution_UsageFacts",
                column: "InventoryItemId");

            migrationBuilder.CreateIndex(
                name: "IX_CostAttribution_UsageFacts_OccurredAt",
                table: "CostAttribution_UsageFacts",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_CostAttribution_UsageFacts_SourceEventId_SourceEventType_InventoryItemId",
                table: "CostAttribution_UsageFacts",
                columns: new[] { "SourceEventId", "SourceEventType", "InventoryItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CostAttribution_UsageFacts_TestId",
                table: "CostAttribution_UsageFacts",
                column: "TestId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CostAttribution_UsageFacts");
        }
    }
}
