using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIsSoftDeletedToRadiologyStudyAndMakeAccessionNumberOptional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "AccessionNumber",
                table: "RadiologyStudies",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AddColumn<bool>(
                name: "IsSoftDeleted",
                table: "RadiologyStudies",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSoftDeleted",
                table: "RadiologyStudies");

            migrationBuilder.AlterColumn<string>(
                name: "AccessionNumber",
                table: "RadiologyStudies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");
        }
    }
}
