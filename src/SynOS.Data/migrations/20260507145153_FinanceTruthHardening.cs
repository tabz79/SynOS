using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class FinanceTruthHardening : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "ReferralPayableFacts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_ReferralPayableFacts_ReferralPartnerId",
                table: "ReferralPayableFacts",
                column: "ReferralPartnerId");

            migrationBuilder.AddForeignKey(
                name: "FK_ReferralPayableFacts_ReferralPartners_ReferralPartnerId",
                table: "ReferralPayableFacts",
                column: "ReferralPartnerId",
                principalTable: "ReferralPartners",
                principalColumn: "ReferralPartnerId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReferralPayableFacts_ReferralPartners_ReferralPartnerId",
                table: "ReferralPayableFacts");

            migrationBuilder.DropIndex(
                name: "IX_ReferralPayableFacts_ReferralPartnerId",
                table: "ReferralPayableFacts");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "ReferralPayableFacts");
        }
    }
}
