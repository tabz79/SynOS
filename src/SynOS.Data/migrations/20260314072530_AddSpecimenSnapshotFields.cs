using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSpecimenSnapshotFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SpecimenTypeName",
                table: "Specimens",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TubeCode",
                table: "Specimens",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TubeCount",
                table: "Specimens",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "TubeName",
                table: "Specimens",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SpecimenTypeName",
                table: "Specimens");

            migrationBuilder.DropColumn(
                name: "TubeCode",
                table: "Specimens");

            migrationBuilder.DropColumn(
                name: "TubeCount",
                table: "Specimens");

            migrationBuilder.DropColumn(
                name: "TubeName",
                table: "Specimens");
        }
    }
}
