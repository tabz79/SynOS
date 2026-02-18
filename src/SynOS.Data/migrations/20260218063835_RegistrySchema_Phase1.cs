using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class RegistrySchema_Phase1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DepartmentId",
                table: "Tests",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsProfile",
                table: "Tests",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "VisitId1",
                table: "Specimens",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DepartmentMasters",
                columns: table => new
                {
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepartmentMasters", x => x.DepartmentId);
                });

            migrationBuilder.CreateTable(
                name: "ProfileMaps",
                columns: table => new
                {
                    ProfileMapId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParentTestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ChildTestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Sequence = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileMaps", x => x.ProfileMapId);
                    table.ForeignKey(
                        name: "FK_ProfileMaps_Tests_ChildTestId",
                        column: x => x.ChildTestId,
                        principalTable: "Tests",
                        principalColumn: "TestId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProfileMaps_Tests_ParentTestId",
                        column: x => x.ParentTestId,
                        principalTable: "Tests",
                        principalColumn: "TestId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TestPricing",
                columns: table => new
                {
                    PricingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BasePrice = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestId1 = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TestPricing", x => x.PricingId);
                    table.ForeignKey(
                        name: "FK_TestPricing_Tests_TestId",
                        column: x => x.TestId,
                        principalTable: "Tests",
                        principalColumn: "TestId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TestPricing_Tests_TestId1",
                        column: x => x.TestId1,
                        principalTable: "Tests",
                        principalColumn: "TestId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tests_DepartmentId",
                table: "Tests",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Specimens_VisitId1",
                table: "Specimens",
                column: "VisitId1");

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentMasters_Code",
                table: "DepartmentMasters",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProfileMaps_ChildTestId",
                table: "ProfileMaps",
                column: "ChildTestId");

            migrationBuilder.CreateIndex(
                name: "IX_ProfileMaps_ParentTestId_ChildTestId",
                table: "ProfileMaps",
                columns: new[] { "ParentTestId", "ChildTestId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TestPricing_TestId_EffectiveFrom",
                table: "TestPricing",
                columns: new[] { "TestId", "EffectiveFrom" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TestPricing_TestId1",
                table: "TestPricing",
                column: "TestId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Specimens_Visits_VisitId1",
                table: "Specimens",
                column: "VisitId1",
                principalTable: "Visits",
                principalColumn: "VisitId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tests_DepartmentMasters_DepartmentId",
                table: "Tests",
                column: "DepartmentId",
                principalTable: "DepartmentMasters",
                principalColumn: "DepartmentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Specimens_Visits_VisitId1",
                table: "Specimens");

            migrationBuilder.DropForeignKey(
                name: "FK_Tests_DepartmentMasters_DepartmentId",
                table: "Tests");

            migrationBuilder.DropTable(
                name: "DepartmentMasters");

            migrationBuilder.DropTable(
                name: "ProfileMaps");

            migrationBuilder.DropTable(
                name: "TestPricing");

            migrationBuilder.DropIndex(
                name: "IX_Tests_DepartmentId",
                table: "Tests");

            migrationBuilder.DropIndex(
                name: "IX_Specimens_VisitId1",
                table: "Specimens");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "IsProfile",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "VisitId1",
                table: "Specimens");
        }
    }
}
