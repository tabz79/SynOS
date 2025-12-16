using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class SyncModelsWithDb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_TestDefinitions_TestCode",
                table: "Orders");

            migrationBuilder.RenameColumn(
                name: "RangeId",
                table: "ReferenceRanges",
                newName: "ReferenceRangeId");

            migrationBuilder.AddColumn<int>(
                name: "DefaultTubeType",
                table: "Tests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                table: "Samples",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "ReferenceRanges",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "PriceConfigs",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "Parameters",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<Guid>(
                name: "TestId",
                table: "Orders",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Orders_TestId",
                table: "Orders",
                column: "TestId");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Tests_TestId",
                table: "Orders",
                column: "TestId",
                principalTable: "Tests",
                principalColumn: "TestId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Tests_TestId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_TestId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DefaultTubeType",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Samples");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "ReferenceRanges");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "PriceConfigs");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Parameters");

            migrationBuilder.DropColumn(
                name: "TestId",
                table: "Orders");

            migrationBuilder.RenameColumn(
                name: "ReferenceRangeId",
                table: "ReferenceRanges",
                newName: "RangeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_TestDefinitions_TestCode",
                table: "Orders",
                column: "TestCode",
                principalTable: "TestDefinitions",
                principalColumn: "TestCode",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
