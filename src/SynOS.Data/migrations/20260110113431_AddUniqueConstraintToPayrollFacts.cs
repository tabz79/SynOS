using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueConstraintToPayrollFacts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_PayrollFacts_PayrollRunId_EmployeeId_PayComponentId",
                table: "PayrollFacts",
                columns: new[] { "PayrollRunId", "EmployeeId", "PayComponentId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PayrollFacts_PayrollRunId_EmployeeId_PayComponentId",
                table: "PayrollFacts");
        }
    }
}
