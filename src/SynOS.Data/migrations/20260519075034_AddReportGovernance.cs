using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReportGovernance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SupersededReportId",
                table: "Reports",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ParameterMasters",
                columns: table => new
                {
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CanonicalName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ShortName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UnitType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DefaultUnit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DataType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParameterMasters", x => x.ParameterCode);
                });

            migrationBuilder.Sql(@"
                INSERT INTO ParameterMasters (ParameterCode, CanonicalName, ShortName, UnitType, DefaultUnit, DataType, CreatedAt, UpdatedAt)
                SELECT DISTINCT ParameterCode, MAX(ParameterName), MIN(ParameterCode), 'Default', MAX(Unit), MAX(DataType), GETUTCDATE(), GETUTCDATE()
                FROM Parameters
                GROUP BY ParameterCode;
            ");

            migrationBuilder.CreateTable(
                name: "AnalyzerParameterMaps",
                columns: table => new
                {
                    MapId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyzerId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ExternalParameterCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    InternalParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnalyzerParameterMaps", x => x.MapId);
                    table.ForeignKey(
                        name: "FK_AnalyzerParameterMaps_ParameterMasters_InternalParameterCode",
                        column: x => x.InternalParameterCode,
                        principalTable: "ParameterMasters",
                        principalColumn: "ParameterCode",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DerivedParameterRules",
                columns: table => new
                {
                    RuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FormulaExpression = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DerivedParameterRules", x => x.RuleId);
                    table.ForeignKey(
                        name: "FK_DerivedParameterRules_ParameterMasters_ParameterCode",
                        column: x => x.ParameterCode,
                        principalTable: "ParameterMasters",
                        principalColumn: "ParameterCode",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RangeProfiles",
                columns: table => new
                {
                    ProfileId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ProfileName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RangeProfiles", x => x.ProfileId);
                    table.ForeignKey(
                        name: "FK_RangeProfiles_ParameterMasters_ParameterCode",
                        column: x => x.ParameterCode,
                        principalTable: "ParameterMasters",
                        principalColumn: "ParameterCode",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RangeConditions",
                columns: table => new
                {
                    ConditionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Sex = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    AgeMinDays = table.Column<int>(type: "int", nullable: false),
                    AgeMaxDays = table.Column<int>(type: "int", nullable: false),
                    FastingStatus = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Methodology = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    InstrumentCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MinNormal = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    MaxNormal = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    MinCritical = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    MaxCritical = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    TextRange = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RangeConditions", x => x.ConditionId);
                    table.ForeignKey(
                        name: "FK_RangeConditions_RangeProfiles_ProfileId",
                        column: x => x.ProfileId,
                        principalTable: "RangeProfiles",
                        principalColumn: "ProfileId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Reports_SupersededReportId",
                table: "Reports",
                column: "SupersededReportId");

            migrationBuilder.CreateIndex(
                name: "IX_Parameters_ParameterCode",
                table: "Parameters",
                column: "ParameterCode");

            migrationBuilder.CreateIndex(
                name: "IX_AnalyzerParameterMaps_AnalyzerId_ExternalParameterCode",
                table: "AnalyzerParameterMaps",
                columns: new[] { "AnalyzerId", "ExternalParameterCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AnalyzerParameterMaps_InternalParameterCode",
                table: "AnalyzerParameterMaps",
                column: "InternalParameterCode");

            migrationBuilder.CreateIndex(
                name: "IX_DerivedParameterRules_ParameterCode",
                table: "DerivedParameterRules",
                column: "ParameterCode");

            migrationBuilder.CreateIndex(
                name: "IX_RangeConditions_ProfileId",
                table: "RangeConditions",
                column: "ProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_RangeProfiles_ParameterCode",
                table: "RangeProfiles",
                column: "ParameterCode");

            migrationBuilder.AddForeignKey(
                name: "FK_Parameters_ParameterMasters_ParameterCode",
                table: "Parameters",
                column: "ParameterCode",
                principalTable: "ParameterMasters",
                principalColumn: "ParameterCode",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Reports_Reports_SupersededReportId",
                table: "Reports",
                column: "SupersededReportId",
                principalTable: "Reports",
                principalColumn: "ReportId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Parameters_ParameterMasters_ParameterCode",
                table: "Parameters");

            migrationBuilder.DropForeignKey(
                name: "FK_Reports_Reports_SupersededReportId",
                table: "Reports");

            migrationBuilder.DropTable(
                name: "AnalyzerParameterMaps");

            migrationBuilder.DropTable(
                name: "DerivedParameterRules");

            migrationBuilder.DropTable(
                name: "RangeConditions");

            migrationBuilder.DropTable(
                name: "RangeProfiles");

            migrationBuilder.DropTable(
                name: "ParameterMasters");

            migrationBuilder.DropIndex(
                name: "IX_Reports_SupersededReportId",
                table: "Reports");

            migrationBuilder.DropIndex(
                name: "IX_Parameters_ParameterCode",
                table: "Parameters");

            migrationBuilder.DropColumn(
                name: "SupersededReportId",
                table: "Reports");
        }
    }
}
