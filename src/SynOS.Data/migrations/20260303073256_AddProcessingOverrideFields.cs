using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProcessingOverrideFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsOverridden",
                table: "ProcessingAssignments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "OverriddenByUserId",
                table: "ProcessingAssignments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OverrideReason",
                table: "ProcessingAssignments",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsOverridden",
                table: "ProcessingAssignments");

            migrationBuilder.DropColumn(
                name: "OverriddenByUserId",
                table: "ProcessingAssignments");

            migrationBuilder.DropColumn(
                name: "OverrideReason",
                table: "ProcessingAssignments");
        }
    }
}
