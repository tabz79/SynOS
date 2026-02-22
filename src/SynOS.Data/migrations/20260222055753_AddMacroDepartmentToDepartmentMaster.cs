using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMacroDepartmentToDepartmentMaster : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MacroDepartment",
                table: "DepartmentMasters",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            // DATA MIGRATION
            migrationBuilder.Sql("UPDATE DepartmentMasters SET MacroDepartment = 'Radiology' WHERE Name = 'Radiology'");
            migrationBuilder.Sql("UPDATE DepartmentMasters SET MacroDepartment = 'Pathology' WHERE Name IN ('Biochemistry', 'Pathology')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MacroDepartment",
                table: "DepartmentMasters");
        }
    }
}
