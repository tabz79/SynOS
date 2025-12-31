using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPayableFactSourcePaymentId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "Payables");

            migrationBuilder.AddColumn<bool>(
                name: "IsReferred",
                table: "Visits",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PaymentCollectionModel",
                table: "Visits",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReferralPartnerId",
                table: "Visits",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PayableFacts",
                schema: "Payables",
                columns: table => new
                {
                    PayableFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferralPartnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AmountOwed = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    SourceSpendFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourcePaymentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayableFacts", x => x.PayableFactId);
                });

            migrationBuilder.CreateTable(
                name: "ReferralPartners",
                columns: table => new
                {
                    ReferralPartnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PartnerType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ContactInfo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferralPartners", x => x.ReferralPartnerId);
                });

            migrationBuilder.CreateTable(
                name: "ReferralCommissionRules",
                columns: table => new
                {
                    RuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferralPartnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommissionType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CommissionValue = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferralCommissionRules", x => x.RuleId);
                    table.ForeignKey(
                        name: "FK_ReferralCommissionRules_ReferralPartners_ReferralPartnerId",
                        column: x => x.ReferralPartnerId,
                        principalTable: "ReferralPartners",
                        principalColumn: "ReferralPartnerId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReferralCommissionRules_Tests_TestId",
                        column: x => x.TestId,
                        principalTable: "Tests",
                        principalColumn: "TestId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Visits_ReferralPartnerId",
                table: "Visits",
                column: "ReferralPartnerId");

            migrationBuilder.CreateIndex(
                name: "IX_PayableFacts_SourcePaymentId",
                schema: "Payables",
                table: "PayableFacts",
                column: "SourcePaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_ReferralCommissionRules_ReferralPartnerId_TestId_EffectiveFrom",
                table: "ReferralCommissionRules",
                columns: new[] { "ReferralPartnerId", "TestId", "EffectiveFrom" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReferralCommissionRules_TestId",
                table: "ReferralCommissionRules",
                column: "TestId");

            migrationBuilder.CreateIndex(
                name: "IX_ReferralPartners_Name",
                table: "ReferralPartners",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Visits_ReferralPartners_ReferralPartnerId",
                table: "Visits",
                column: "ReferralPartnerId",
                principalTable: "ReferralPartners",
                principalColumn: "ReferralPartnerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Visits_ReferralPartners_ReferralPartnerId",
                table: "Visits");

            migrationBuilder.DropTable(
                name: "PayableFacts",
                schema: "Payables");

            migrationBuilder.DropTable(
                name: "ReferralCommissionRules");

            migrationBuilder.DropTable(
                name: "ReferralPartners");

            migrationBuilder.DropIndex(
                name: "IX_Visits_ReferralPartnerId",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "IsReferred",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "PaymentCollectionModel",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "ReferralPartnerId",
                table: "Visits");
        }
    }
}
