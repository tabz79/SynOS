using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class ShiftToSpecimenArchitecture : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SampleRejections");

            migrationBuilder.DropTable(
                name: "Samples");

            migrationBuilder.DropColumn(
                name: "DefaultTubeType",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "DefaultTubeType",
                table: "TestDefinitions");

            migrationBuilder.AddColumn<string>(
                name: "SpecimenTypeCode",
                table: "Tests",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SpecimenTypeCode",
                table: "TestDefinitions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "SpecimenId",
                table: "Orders",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "Branches",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "AccessionSequences",
                columns: table => new
                {
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastSequenceNumber = table.Column<int>(type: "int", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccessionSequences", x => new { x.BranchId, x.Date });
                });

            migrationBuilder.CreateTable(
                name: "SpecimenTypes",
                columns: table => new
                {
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ContainerCategory = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpecimenTypes", x => x.Code);
                });

            migrationBuilder.CreateTable(
                name: "Specimens",
                columns: table => new
                {
                    SpecimenId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SpecimenTypeCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AccessionNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CollectedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CollectedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Specimens", x => x.SpecimenId);
                    table.ForeignKey(
                        name: "FK_Specimens_SpecimenTypes_SpecimenTypeCode",
                        column: x => x.SpecimenTypeCode,
                        principalTable: "SpecimenTypes",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Specimens_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Visits",
                        principalColumn: "VisitId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tests_SpecimenTypeCode",
                table: "Tests",
                column: "SpecimenTypeCode");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_SpecimenId",
                table: "Orders",
                column: "SpecimenId");

            migrationBuilder.CreateIndex(
                name: "IX_Specimens_AccessionNumber",
                table: "Specimens",
                column: "AccessionNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Specimens_SpecimenTypeCode",
                table: "Specimens",
                column: "SpecimenTypeCode");

            migrationBuilder.CreateIndex(
                name: "IX_Specimens_VisitId",
                table: "Specimens",
                column: "VisitId");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Specimens_SpecimenId",
                table: "Orders",
                column: "SpecimenId",
                principalTable: "Specimens",
                principalColumn: "SpecimenId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tests_SpecimenTypes_SpecimenTypeCode",
                table: "Tests",
                column: "SpecimenTypeCode",
                principalTable: "SpecimenTypes",
                principalColumn: "Code");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Specimens_SpecimenId",
                table: "Orders");

            migrationBuilder.DropForeignKey(
                name: "FK_Tests_SpecimenTypes_SpecimenTypeCode",
                table: "Tests");

            migrationBuilder.DropTable(
                name: "AccessionSequences");

            migrationBuilder.DropTable(
                name: "Specimens");

            migrationBuilder.DropTable(
                name: "SpecimenTypes");

            migrationBuilder.DropIndex(
                name: "IX_Tests_SpecimenTypeCode",
                table: "Tests");

            migrationBuilder.DropIndex(
                name: "IX_Orders_SpecimenId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "SpecimenTypeCode",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "SpecimenTypeCode",
                table: "TestDefinitions");

            migrationBuilder.DropColumn(
                name: "SpecimenId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "Branches");

            migrationBuilder.AddColumn<int>(
                name: "DefaultTubeType",
                table: "Tests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DefaultTubeType",
                table: "TestDefinitions",
                type: "int",
                maxLength: 20,
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Samples",
                columns: table => new
                {
                    SampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CollectedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Barcode = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CollectedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    IsRejected = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TubeType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Samples", x => x.SampleId);
                    table.ForeignKey(
                        name: "FK_Samples_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Samples_Users_CollectedByUserId",
                        column: x => x.CollectedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "SampleRejections",
                columns: table => new
                {
                    RejectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    NewSampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RejectedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    RejectedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RequiresRecollection = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SampleRejections", x => x.RejectionId);
                    table.ForeignKey(
                        name: "FK_SampleRejections_Samples_NewSampleId",
                        column: x => x.NewSampleId,
                        principalTable: "Samples",
                        principalColumn: "SampleId");
                    table.ForeignKey(
                        name: "FK_SampleRejections_Samples_SampleId",
                        column: x => x.SampleId,
                        principalTable: "Samples",
                        principalColumn: "SampleId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SampleRejections_Users_RejectedByUserId",
                        column: x => x.RejectedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SampleRejections_NewSampleId",
                table: "SampleRejections",
                column: "NewSampleId");

            migrationBuilder.CreateIndex(
                name: "IX_SampleRejections_RejectedByUserId",
                table: "SampleRejections",
                column: "RejectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SampleRejections_SampleId",
                table: "SampleRejections",
                column: "SampleId");

            migrationBuilder.CreateIndex(
                name: "IX_Samples_Barcode",
                table: "Samples",
                column: "Barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Samples_CollectedByUserId",
                table: "Samples",
                column: "CollectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Samples_OrderId",
                table: "Samples",
                column: "OrderId");
        }
    }
}
