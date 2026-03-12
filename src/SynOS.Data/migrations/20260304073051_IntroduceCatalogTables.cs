using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class IntroduceCatalogTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Catalog_ServiceCategories",
                columns: table => new
                {
                    ServiceCategoryCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ServiceCategoryName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Catalog_ServiceCategories", x => x.ServiceCategoryCode);
                });

            migrationBuilder.CreateTable(
                name: "Catalog_SpecimenTypes",
                columns: table => new
                {
                    SpecimenCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SpecimenName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Catalog_SpecimenTypes", x => x.SpecimenCode);
                });

            migrationBuilder.CreateTable(
                name: "Catalog_TubeTypes",
                columns: table => new
                {
                    TubeCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TubeName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Color = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Catalog_TubeTypes", x => x.TubeCode);
                });

            migrationBuilder.CreateTable(
                name: "Catalog_ProcessingDepartments",
                columns: table => new
                {
                    DepartmentCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DepartmentName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ServiceCategoryCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    RequiresSpecimen = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Catalog_ProcessingDepartments", x => x.DepartmentCode);
                    table.ForeignKey(
                        name: "FK_Catalog_ProcessingDepartments_Catalog_ServiceCategories_ServiceCategoryCode",
                        column: x => x.ServiceCategoryCode,
                        principalTable: "Catalog_ServiceCategories",
                        principalColumn: "ServiceCategoryCode",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Catalog_Tests",
                columns: table => new
                {
                    TestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TestName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DepartmentCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SpecimenCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    TubeCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    IsPanel = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Catalog_Tests", x => x.TestCode);
                    table.ForeignKey(
                        name: "FK_Catalog_Tests_Catalog_ProcessingDepartments_DepartmentCode",
                        column: x => x.DepartmentCode,
                        principalTable: "Catalog_ProcessingDepartments",
                        principalColumn: "DepartmentCode",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Catalog_Tests_Catalog_SpecimenTypes_SpecimenCode",
                        column: x => x.SpecimenCode,
                        principalTable: "Catalog_SpecimenTypes",
                        principalColumn: "SpecimenCode",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Catalog_Tests_Catalog_TubeTypes_TubeCode",
                        column: x => x.TubeCode,
                        principalTable: "Catalog_TubeTypes",
                        principalColumn: "TubeCode",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Catalog_PanelMappings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PanelTestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ChildTestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Catalog_PanelMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Catalog_PanelMappings_Catalog_Tests_ChildTestCode",
                        column: x => x.ChildTestCode,
                        principalTable: "Catalog_Tests",
                        principalColumn: "TestCode",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Catalog_PanelMappings_Catalog_Tests_PanelTestCode",
                        column: x => x.PanelTestCode,
                        principalTable: "Catalog_Tests",
                        principalColumn: "TestCode",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Catalog_Parameters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ParameterName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DataType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ReferenceRange = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false),
                    AnalyzerCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    EnumOptions = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Catalog_Parameters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Catalog_Parameters_Catalog_Tests_TestCode",
                        column: x => x.TestCode,
                        principalTable: "Catalog_Tests",
                        principalColumn: "TestCode",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Catalog_PanelMappings_ChildTestCode",
                table: "Catalog_PanelMappings",
                column: "ChildTestCode");

            migrationBuilder.CreateIndex(
                name: "IX_Catalog_PanelMappings_PanelTestCode_ChildTestCode",
                table: "Catalog_PanelMappings",
                columns: new[] { "PanelTestCode", "ChildTestCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Catalog_Parameters_TestCode_ParameterCode",
                table: "Catalog_Parameters",
                columns: new[] { "TestCode", "ParameterCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Catalog_ProcessingDepartments_ServiceCategoryCode",
                table: "Catalog_ProcessingDepartments",
                column: "ServiceCategoryCode");

            migrationBuilder.CreateIndex(
                name: "IX_Catalog_Tests_DepartmentCode",
                table: "Catalog_Tests",
                column: "DepartmentCode");

            migrationBuilder.CreateIndex(
                name: "IX_Catalog_Tests_SpecimenCode",
                table: "Catalog_Tests",
                column: "SpecimenCode");

            migrationBuilder.CreateIndex(
                name: "IX_Catalog_Tests_TubeCode",
                table: "Catalog_Tests",
                column: "TubeCode");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Catalog_PanelMappings");

            migrationBuilder.DropTable(
                name: "Catalog_Parameters");

            migrationBuilder.DropTable(
                name: "Catalog_Tests");

            migrationBuilder.DropTable(
                name: "Catalog_ProcessingDepartments");

            migrationBuilder.DropTable(
                name: "Catalog_SpecimenTypes");

            migrationBuilder.DropTable(
                name: "Catalog_TubeTypes");

            migrationBuilder.DropTable(
                name: "Catalog_ServiceCategories");
        }
    }
}
