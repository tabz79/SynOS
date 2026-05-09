using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSpendFactMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "SpendFacts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "SpendFacts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayeeName",
                table: "SpendFacts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ReceivableFacts_ReferralPartners_ReferralPartnerId",
                schema: "AR",
                table: "ReceivableFacts",
                column: "ReferralPartnerId",
                principalTable: "ReferralPartners",
                principalColumn: "ReferralPartnerId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReceivableFacts_ReferralPartners_ReferralPartnerId",
                schema: "AR",
                table: "ReceivableFacts");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "SpendFacts");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "SpendFacts");

            migrationBuilder.DropColumn(
                name: "PayeeName",
                table: "SpendFacts");
        }
    }
}
