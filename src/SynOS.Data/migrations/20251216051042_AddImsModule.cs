using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddImsModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IMS_TubeMasters",
                columns: table => new
                {
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    UnitOfMeasure = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_TubeMasters", x => x.TubeId);
                });

            migrationBuilder.CreateTable(
                name: "IMS_TestTubeMaps",
                columns: table => new
                {
                    MapId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuantityPerSample = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_TestTubeMaps", x => x.MapId);
                    table.ForeignKey(
                        name: "FK_IMS_TestTubeMaps_IMS_TubeMasters_TubeId",
                        column: x => x.TubeId,
                        principalTable: "IMS_TubeMasters",
                        principalColumn: "TubeId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IMS_TestTubeMaps_Tests_TestId",
                        column: x => x.TestId,
                        principalTable: "Tests",
                        principalColumn: "TestId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IMS_TubeConsumptions",
                columns: table => new
                {
                    ConsumptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    ConsumedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ConsumedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_TubeConsumptions", x => x.ConsumptionId);
                    table.ForeignKey(
                        name: "FK_IMS_TubeConsumptions_IMS_TubeMasters_TubeId",
                        column: x => x.TubeId,
                        principalTable: "IMS_TubeMasters",
                        principalColumn: "TubeId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IMS_TubeConsumptions_Samples_SampleId",
                        column: x => x.SampleId,
                        principalTable: "Samples",
                        principalColumn: "SampleId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_TubeConsumptions_Users_ConsumedByUserId",
                        column: x => x.ConsumedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IMS_TubeStocks",
                columns: table => new
                {
                    StockId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CurrentQuantity = table.Column<int>(type: "int", nullable: false),
                    AlertQuantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_TubeStocks", x => x.StockId);
                    table.ForeignKey(
                        name: "FK_IMS_TubeStocks_IMS_TubeMasters_TubeId",
                        column: x => x.TubeId,
                        principalTable: "IMS_TubeMasters",
                        principalColumn: "TubeId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TestTubeMaps_TestId_TubeId",
                table: "IMS_TestTubeMaps",
                columns: new[] { "TestId", "TubeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TestTubeMaps_TubeId",
                table: "IMS_TestTubeMaps",
                column: "TubeId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeConsumptions_ConsumedByUserId",
                table: "IMS_TubeConsumptions",
                column: "ConsumedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeConsumptions_SampleId_TubeId",
                table: "IMS_TubeConsumptions",
                columns: new[] { "SampleId", "TubeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeConsumptions_TubeId",
                table: "IMS_TubeConsumptions",
                column: "TubeId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeMasters_Code",
                table: "IMS_TubeMasters",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeStocks_TubeId_BranchId",
                table: "IMS_TubeStocks",
                columns: new[] { "TubeId", "BranchId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IMS_TestTubeMaps");

            migrationBuilder.DropTable(
                name: "IMS_TubeConsumptions");

            migrationBuilder.DropTable(
                name: "IMS_TubeStocks");

            migrationBuilder.DropTable(
                name: "IMS_TubeMasters");
        }
    }
}
