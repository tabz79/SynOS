using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPacsTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PacsSeries",
                columns: table => new
                {
                    SeriesId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RadiologyStudyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrgId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    StudyInstanceUid = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SeriesInstanceUid = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Modality = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SeriesNumber = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PacsSeries", x => x.SeriesId);
                    table.ForeignKey(
                        name: "FK_PacsSeries_RadiologyStudies_RadiologyStudyId",
                        column: x => x.RadiologyStudyId,
                        principalTable: "RadiologyStudies",
                        principalColumn: "RadiologyStudyId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PacsSeries_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PacsInstances",
                columns: table => new
                {
                    InstanceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SeriesId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RadiologyStudyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrgId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    StudyInstanceUid = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SeriesInstanceUid = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SopInstanceUid = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    InstanceNumber = table.Column<int>(type: "int", nullable: true),
                    FrameCount = table.Column<int>(type: "int", nullable: true),
                    FilePath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PacsInstances", x => x.InstanceId);
                    table.ForeignKey(
                        name: "FK_PacsInstances_PacsSeries_SeriesId",
                        column: x => x.SeriesId,
                        principalTable: "PacsSeries",
                        principalColumn: "SeriesId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PacsInstances_RadiologyStudies_RadiologyStudyId",
                        column: x => x.RadiologyStudyId,
                        principalTable: "RadiologyStudies",
                        principalColumn: "RadiologyStudyId");
                    table.ForeignKey(
                        name: "FK_PacsInstances_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PacsInstances_CreatedBy",
                table: "PacsInstances",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_PacsInstances_RadiologyStudyId",
                table: "PacsInstances",
                column: "RadiologyStudyId");

            migrationBuilder.CreateIndex(
                name: "IX_PacsInstances_SeriesId",
                table: "PacsInstances",
                column: "SeriesId");

            migrationBuilder.CreateIndex(
                name: "IX_PacsInstances_SopInstanceUid",
                table: "PacsInstances",
                column: "SopInstanceUid");

            migrationBuilder.CreateIndex(
                name: "IX_PacsSeries_CreatedBy",
                table: "PacsSeries",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_PacsSeries_RadiologyStudyId",
                table: "PacsSeries",
                column: "RadiologyStudyId");

            migrationBuilder.CreateIndex(
                name: "IX_PacsSeries_SeriesInstanceUid",
                table: "PacsSeries",
                column: "SeriesInstanceUid");

            migrationBuilder.CreateIndex(
                name: "IX_PacsSeries_StudyInstanceUid",
                table: "PacsSeries",
                column: "StudyInstanceUid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PacsInstances");

            migrationBuilder.DropTable(
                name: "PacsSeries");
        }
    }
}
