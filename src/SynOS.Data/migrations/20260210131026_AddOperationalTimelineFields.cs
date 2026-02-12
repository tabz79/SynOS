using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOperationalTimelineFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "IntentId",
                table: "BranchOperationalEvents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Metadata",
                table: "BranchOperationalEvents",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Visibility",
                table: "BranchOperationalEvents",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IntentId",
                table: "BranchOperationalEvents");

            migrationBuilder.DropColumn(
                name: "Metadata",
                table: "BranchOperationalEvents");

            migrationBuilder.DropColumn(
                name: "Visibility",
                table: "BranchOperationalEvents");
        }
    }
}
