using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPayrollStatutoryFieldsToEmployee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AadhaarNumber",
                table: "Employees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ESIEnabled",
                table: "Employees",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "ESIPercentage",
                table: "Employees",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Employees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PFEnabled",
                table: "Employees",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "PFPercentage",
                table: "Employees",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "PanNumber",
                table: "Employees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TDSEnabled",
                table: "Employees",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "TDSMode",
                table: "Employees",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "TDSValue",
                table: "Employees",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "LopDaysCount",
                schema: "Payables",
                table: "EmployeePayables",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SnapshotBaseSalary",
                schema: "Payables",
                table: "EmployeePayables",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SnapshotESIRate",
                schema: "Payables",
                table: "EmployeePayables",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SnapshotPFRate",
                schema: "Payables",
                table: "EmployeePayables",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "SnapshotTDSMode",
                schema: "Payables",
                table: "EmployeePayables",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "SnapshotTDSValue",
                schema: "Payables",
                table: "EmployeePayables",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AadhaarNumber",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "ESIEnabled",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "ESIPercentage",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "PFEnabled",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "PFPercentage",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "PanNumber",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "TDSEnabled",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "TDSMode",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "TDSValue",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "LopDaysCount",
                schema: "Payables",
                table: "EmployeePayables");

            migrationBuilder.DropColumn(
                name: "SnapshotBaseSalary",
                schema: "Payables",
                table: "EmployeePayables");

            migrationBuilder.DropColumn(
                name: "SnapshotESIRate",
                schema: "Payables",
                table: "EmployeePayables");

            migrationBuilder.DropColumn(
                name: "SnapshotPFRate",
                schema: "Payables",
                table: "EmployeePayables");

            migrationBuilder.DropColumn(
                name: "SnapshotTDSMode",
                schema: "Payables",
                table: "EmployeePayables");

            migrationBuilder.DropColumn(
                name: "SnapshotTDSValue",
                schema: "Payables",
                table: "EmployeePayables");
        }
    }
}
