using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFormulaToCatalogParameter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "CatalogTestNotes",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Catalog_TubeTypes",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Catalog_Tests",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Catalog_SpecimenTypes",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Catalog_ServiceCategories",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Catalog_ProcessingDepartments",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AlterColumn<string>(
                name: "EnumOptions",
                table: "Catalog_Parameters",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Formula",
                table: "Catalog_Parameters",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Catalog_Parameters",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "CatalogTestNotes");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Catalog_TubeTypes");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Catalog_Tests");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Catalog_SpecimenTypes");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Catalog_ServiceCategories");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Catalog_ProcessingDepartments");

            migrationBuilder.DropColumn(
                name: "Formula",
                table: "Catalog_Parameters");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Catalog_Parameters");

            migrationBuilder.AlterColumn<string>(
                name: "EnumOptions",
                table: "Catalog_Parameters",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);
        }
    }
}
