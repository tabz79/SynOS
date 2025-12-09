using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLabAnalyzerTestMappingTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LabAnalyzerTestMappings",
                columns: table => new
                {
                    MappingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyzerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyzerTestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SynosTestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    UnitsOverride = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    RefLowOverride = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    RefHighOverride = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabAnalyzerTestMappings", x => x.MappingId);
                    table.ForeignKey(
                        name: "FK_LabAnalyzerTestMappings_LabAnalyzers_AnalyzerId",
                        column: x => x.AnalyzerId,
                        principalTable: "LabAnalyzers",
                        principalColumn: "AnalyzerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerTestMappings_AnalyzerId",
                table: "LabAnalyzerTestMappings",
                column: "AnalyzerId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerTestMappings_AnalyzerId_AnalyzerTestCode",
                table: "LabAnalyzerTestMappings",
                columns: new[] { "AnalyzerId", "AnalyzerTestCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerTestMappings_AnalyzerTestCode",
                table: "LabAnalyzerTestMappings",
                column: "AnalyzerTestCode");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerTestMappings_IsEnabled",
                table: "LabAnalyzerTestMappings",
                column: "IsEnabled");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerTestMappings_SynosTestCode",
                table: "LabAnalyzerTestMappings",
                column: "SynosTestCode");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LabAnalyzerTestMappings");
        }
    }
}
