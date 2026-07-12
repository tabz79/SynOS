using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLicenseFieldsToLab : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EnabledFeatures",
                table: "Labs",
                type: "TEXT",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiryDate",
                table: "Labs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LicenseType",
                table: "Labs",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                defaultValue: "Professional");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EnabledFeatures",
                table: "Labs");

            migrationBuilder.DropColumn(
                name: "ExpiryDate",
                table: "Labs");

            migrationBuilder.DropColumn(
                name: "LicenseType",
                table: "Labs");
        }
    }
}
