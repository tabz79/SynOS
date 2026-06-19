using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogReferenceRange : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Catalog_ReferenceRanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Sex = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    AgeMin = table.Column<int>(type: "int", nullable: true),
                    AgeMax = table.Column<int>(type: "int", nullable: true),
                    RefLow = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    RefHigh = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    CriticalLow = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    CriticalHigh = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    TextRange = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Catalog_ReferenceRanges", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Catalog_ReferenceRanges_TestCode_ParameterCode",
                table: "Catalog_ReferenceRanges",
                columns: new[] { "TestCode", "ParameterCode" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Catalog_ReferenceRanges");
        }
    }
}
