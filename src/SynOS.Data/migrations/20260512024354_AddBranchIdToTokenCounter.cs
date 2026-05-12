using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchIdToTokenCounter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SeriesLetter",
                table: "TokenCounters");

            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "TokenCounters",
                type: "uniqueidentifier",
                maxLength: 1,
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "Prefix",
                table: "TokenCounters",
                type: "nvarchar(5)",
                maxLength: 5,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "TokenCounters");

            migrationBuilder.DropColumn(
                name: "Prefix",
                table: "TokenCounters");

            migrationBuilder.AddColumn<string>(
                name: "SeriesLetter",
                table: "TokenCounters",
                type: "nvarchar(1)",
                maxLength: 1,
                nullable: false,
                defaultValue: "");
        }
    }
}
