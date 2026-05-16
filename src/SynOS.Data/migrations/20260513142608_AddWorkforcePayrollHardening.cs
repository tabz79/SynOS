using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkforcePayrollHardening : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "HR");

            migrationBuilder.AlterColumn<string>(
                name: "Department",
                table: "Employees",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "AccountNumber",
                table: "Employees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankName",
                table: "Employees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "BaseSalary",
                table: "Employees",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "DepartmentId",
                table: "Employees",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContact",
                table: "Employees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IFSC",
                table: "Employees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Employees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SalaryType",
                table: "Employees",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "AttendanceLogs",
                schema: "HR",
                columns: table => new
                {
                    AttendanceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClockIn = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ClockOut = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ShiftType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Source = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EntrySourceId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceLogs", x => x.AttendanceId);
                });

            migrationBuilder.CreateTable(
                name: "EmployeePayables",
                schema: "Payables",
                columns: table => new
                {
                    EmployeePayableId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PayrollRunId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PayrollPeriodId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GrossSalary = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    PFDeduction = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    ESIDeduction = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    TDSDeduction = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    OtherDeductions = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    NetPayable = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    AmountPaid = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SettledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeePayables", x => x.EmployeePayableId);
                });

            migrationBuilder.CreateTable(
                name: "SalaryAdvances",
                schema: "Payables",
                columns: table => new
                {
                    AdvanceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IssuedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IssuedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdjustedInPayrollRunId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalaryAdvances", x => x.AdvanceId);
                });

            migrationBuilder.CreateTable(
                name: "StatutoryConfigs",
                schema: "Payables",
                columns: table => new
                {
                    ConfigId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ComponentName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    EmployeeRate = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    EmployerRate = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StatutoryConfigs", x => x.ConfigId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceLabRateRules_TestId",
                schema: "Payables",
                table: "ReferenceLabRateRules",
                column: "TestId");

            migrationBuilder.CreateIndex(
                name: "IX_PayrollRuns_PayrollPeriodId",
                table: "PayrollRuns",
                column: "PayrollPeriodId");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceLogs_EmployeeId_ClockIn",
                schema: "HR",
                table: "AttendanceLogs",
                columns: new[] { "EmployeeId", "ClockIn" });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeePayables_EmployeeId",
                schema: "Payables",
                table: "EmployeePayables",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeePayables_PayrollRunId",
                schema: "Payables",
                table: "EmployeePayables",
                column: "PayrollRunId");

            migrationBuilder.CreateIndex(
                name: "IX_SalaryAdvances_EmployeeId",
                schema: "Payables",
                table: "SalaryAdvances",
                column: "EmployeeId");

            migrationBuilder.AddForeignKey(
                name: "FK_PayrollRuns_PayrollPeriods_PayrollPeriodId",
                table: "PayrollRuns",
                column: "PayrollPeriodId",
                principalTable: "PayrollPeriods",
                principalColumn: "PayrollPeriodId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ReferenceLabRateRules_Tests_TestId",
                schema: "Payables",
                table: "ReferenceLabRateRules",
                column: "TestId",
                principalTable: "Tests",
                principalColumn: "TestId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PayrollRuns_PayrollPeriods_PayrollPeriodId",
                table: "PayrollRuns");

            migrationBuilder.DropForeignKey(
                name: "FK_ReferenceLabRateRules_Tests_TestId",
                schema: "Payables",
                table: "ReferenceLabRateRules");

            migrationBuilder.DropTable(
                name: "AttendanceLogs",
                schema: "HR");

            migrationBuilder.DropTable(
                name: "EmployeePayables",
                schema: "Payables");

            migrationBuilder.DropTable(
                name: "SalaryAdvances",
                schema: "Payables");

            migrationBuilder.DropTable(
                name: "StatutoryConfigs",
                schema: "Payables");

            migrationBuilder.DropIndex(
                name: "IX_ReferenceLabRateRules_TestId",
                schema: "Payables",
                table: "ReferenceLabRateRules");

            migrationBuilder.DropIndex(
                name: "IX_PayrollRuns_PayrollPeriodId",
                table: "PayrollRuns");

            migrationBuilder.DropColumn(
                name: "AccountNumber",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "BankName",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "BaseSalary",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "EmergencyContact",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "IFSC",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "SalaryType",
                table: "Employees");

            migrationBuilder.AlterColumn<string>(
                name: "Department",
                table: "Employees",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);
        }
    }
}
