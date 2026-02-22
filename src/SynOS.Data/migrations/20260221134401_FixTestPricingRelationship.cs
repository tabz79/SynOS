using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixTestPricingRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TestPricing_Tests_TestId1",
                table: "TestPricing");

            migrationBuilder.DropIndex(
                name: "IX_TestPricing_TestId1",
                table: "TestPricing");

            migrationBuilder.DropColumn(
                name: "TestId1",
                table: "TestPricing");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TestId1",
                table: "TestPricing",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TestPricing_TestId1",
                table: "TestPricing",
                column: "TestId1");

            migrationBuilder.AddForeignKey(
                name: "FK_TestPricing_Tests_TestId1",
                table: "TestPricing",
                column: "TestId1",
                principalTable: "Tests",
                principalColumn: "TestId");
        }
    }
}
