using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class RefinePacsIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PacsSeries_RadiologyStudyId",
                table: "PacsSeries");

            migrationBuilder.DropIndex(
                name: "IX_PacsSeries_SeriesInstanceUid",
                table: "PacsSeries");

            migrationBuilder.DropIndex(
                name: "IX_PacsSeries_StudyInstanceUid",
                table: "PacsSeries");

            migrationBuilder.DropIndex(
                name: "IX_PacsInstances_SeriesId",
                table: "PacsInstances");

            migrationBuilder.DropIndex(
                name: "IX_PacsInstances_SopInstanceUid",
                table: "PacsInstances");

            migrationBuilder.CreateIndex(
                name: "IX_PacsSeries_RadiologyStudyId_StudyInstanceUid_SeriesInstanceUid",
                table: "PacsSeries",
                columns: new[] { "RadiologyStudyId", "StudyInstanceUid", "SeriesInstanceUid" });

            migrationBuilder.CreateIndex(
                name: "IX_PacsInstances_SeriesId_SopInstanceUid",
                table: "PacsInstances",
                columns: new[] { "SeriesId", "SopInstanceUid" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PacsSeries_RadiologyStudyId_StudyInstanceUid_SeriesInstanceUid",
                table: "PacsSeries");

            migrationBuilder.DropIndex(
                name: "IX_PacsInstances_SeriesId_SopInstanceUid",
                table: "PacsInstances");

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

            migrationBuilder.CreateIndex(
                name: "IX_PacsInstances_SeriesId",
                table: "PacsInstances",
                column: "SeriesId");

            migrationBuilder.CreateIndex(
                name: "IX_PacsInstances_SopInstanceUid",
                table: "PacsInstances",
                column: "SopInstanceUid");
        }
    }
}
