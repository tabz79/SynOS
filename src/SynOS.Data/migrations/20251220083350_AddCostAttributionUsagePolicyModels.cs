using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCostAttributionUsagePolicyModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CostAttribution_UsagePolicies",
                columns: table => new
                {
                    UsagePolicyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InventoryItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CostAttribution_UsagePolicies", x => x.UsagePolicyId);
                    table.ForeignKey(
                        name: "FK_CostAttribution_UsagePolicies_IMS_InventoryItems_InventoryItemId",
                        column: x => x.InventoryItemId,
                        principalTable: "IMS_InventoryItems",
                        principalColumn: "ItemId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CostAttribution_UsagePolicies_Tests_TestId",
                        column: x => x.TestId,
                        principalTable: "Tests",
                        principalColumn: "TestId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CostAttribution_UsagePolicyVersions",
                columns: table => new
                {
                    UsagePolicyVersionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UsagePolicyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    EffectiveFrom = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    EffectiveTo = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CostAttribution_UsagePolicyVersions", x => x.UsagePolicyVersionId);
                    table.ForeignKey(
                        name: "FK_CostAttribution_UsagePolicyVersions_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CostAttribution_UsagePolicyVersions_CostAttribution_UsagePolicies_UsagePolicyId",
                        column: x => x.UsagePolicyId,
                        principalTable: "CostAttribution_UsagePolicies",
                        principalColumn: "UsagePolicyId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CostAttribution_UsagePolicyVersions_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CostAttribution_UsagePolicies_InventoryItemId",
                table: "CostAttribution_UsagePolicies",
                column: "InventoryItemId");

            migrationBuilder.CreateIndex(
                name: "IX_CostAttribution_UsagePolicies_TestId_InventoryItemId",
                table: "CostAttribution_UsagePolicies",
                columns: new[] { "TestId", "InventoryItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CostAttribution_UsagePolicyVersions_BranchId",
                table: "CostAttribution_UsagePolicyVersions",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_CostAttribution_UsagePolicyVersions_CreatedByUserId",
                table: "CostAttribution_UsagePolicyVersions",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CostAttribution_UsagePolicyVersions_UsagePolicyId_BranchId_EffectiveFrom",
                table: "CostAttribution_UsagePolicyVersions",
                columns: new[] { "UsagePolicyId", "BranchId", "EffectiveFrom" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CostAttribution_UsagePolicyVersions");

            migrationBuilder.DropTable(
                name: "CostAttribution_UsagePolicies");
        }
    }
}
