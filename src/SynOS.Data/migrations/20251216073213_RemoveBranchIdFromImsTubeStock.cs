using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveBranchIdFromImsTubeStock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_IMS_TubeStocks_TubeId_BranchId",
                table: "IMS_TubeStocks");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "IMS_TubeStocks");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeStocks_TubeId",
                table: "IMS_TubeStocks",
                column: "TubeId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_IMS_TubeStocks_TubeId",
                table: "IMS_TubeStocks");

            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "IMS_TubeStocks",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeStocks_TubeId_BranchId",
                table: "IMS_TubeStocks",
                columns: new[] { "TubeId", "BranchId" },
                unique: true);
        }
    }
}
