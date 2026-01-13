using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGovernanceSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TimePeriods_PeriodDate",
                table: "TimePeriods");

            migrationBuilder.DropIndex(
                name: "IX_PayrollFacts_PayrollRunId_EmployeeId_PayComponentId",
                table: "PayrollFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Time_WorkSessionBoundaryFacts",
                table: "Time_WorkSessionBoundaryFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Time_ShiftAttributionFacts",
                table: "Time_ShiftAttributionFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Time_OvertimeMarkerFacts",
                table: "Time_OvertimeMarkerFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Time_ManualWorkSessionAssertionFacts",
                table: "Time_ManualWorkSessionAssertionFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Time_ClockEventFacts",
                table: "Time_ClockEventFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Leave_LeaveFacts",
                table: "Leave_LeaveFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Leave_LeaveCancellationFacts",
                table: "Leave_LeaveCancellationFacts");

            migrationBuilder.RenameTable(
                name: "Time_WorkSessionBoundaryFacts",
                newName: "WorkSessionBoundaryFacts");

            migrationBuilder.RenameTable(
                name: "Time_ShiftAttributionFacts",
                newName: "ShiftAttributionFacts");

            migrationBuilder.RenameTable(
                name: "Time_OvertimeMarkerFacts",
                newName: "OvertimeMarkerFacts");

            migrationBuilder.RenameTable(
                name: "Time_ManualWorkSessionAssertionFacts",
                newName: "ManualWorkSessionAssertionFacts");

            migrationBuilder.RenameTable(
                name: "Time_ClockEventFacts",
                newName: "ClockEventFacts");

            migrationBuilder.RenameTable(
                name: "Leave_LeaveFacts",
                newName: "LeaveFacts");

            migrationBuilder.RenameTable(
                name: "Leave_LeaveCancellationFacts",
                newName: "LeaveCancellationFacts");

            migrationBuilder.AddPrimaryKey(
                name: "PK_WorkSessionBoundaryFacts",
                table: "WorkSessionBoundaryFacts",
                column: "WorkSessionBoundaryFactId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ShiftAttributionFacts",
                table: "ShiftAttributionFacts",
                column: "ShiftAttributionFactId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_OvertimeMarkerFacts",
                table: "OvertimeMarkerFacts",
                column: "OvertimeMarkerFactId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ManualWorkSessionAssertionFacts",
                table: "ManualWorkSessionAssertionFacts",
                column: "ManualWorkSessionAssertionFactId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ClockEventFacts",
                table: "ClockEventFacts",
                column: "ClockEventFactId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LeaveFacts",
                table: "LeaveFacts",
                column: "LeaveFactId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LeaveCancellationFacts",
                table: "LeaveCancellationFacts",
                column: "LeaveCancellationFactId");

            migrationBuilder.CreateTable(
                name: "Governance_ApprovalRules",
                columns: table => new
                {
                    ApprovalRuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActionName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ThresholdAmount = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    RequiredRoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequiresSeparationOfDuties = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Governance_ApprovalRules", x => x.ApprovalRuleId);
                });

            migrationBuilder.CreateTable(
                name: "Governance_Assignments",
                columns: table => new
                {
                    AssignmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScopeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Governance_Assignments", x => x.AssignmentId);
                });

            migrationBuilder.CreateTable(
                name: "Governance_Capabilities",
                columns: table => new
                {
                    CapabilityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Module = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Governance_Capabilities", x => x.CapabilityId);
                });

            migrationBuilder.CreateTable(
                name: "Governance_RoleCapabilities",
                columns: table => new
                {
                    RoleCapabilityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CapabilityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Governance_RoleCapabilities", x => x.RoleCapabilityId);
                });

            migrationBuilder.CreateTable(
                name: "Governance_Roles",
                columns: table => new
                {
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Governance_Roles", x => x.RoleId);
                });

            migrationBuilder.CreateTable(
                name: "StatutoryObligationFacts",
                columns: table => new
                {
                    StatutoryObligationFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AuthorityType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ObligationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    LegalPeriodStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LegalPeriodEnd = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SourceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SourceFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecordedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StatutoryObligationFacts", x => x.StatutoryObligationFactId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Governance_Assignments_UserId_RoleId",
                table: "Governance_Assignments",
                columns: new[] { "UserId", "RoleId" });

            migrationBuilder.CreateIndex(
                name: "IX_Governance_RoleCapabilities_RoleId_CapabilityId",
                table: "Governance_RoleCapabilities",
                columns: new[] { "RoleId", "CapabilityId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StatutoryObligationFacts_SourceFactId",
                table: "StatutoryObligationFacts",
                column: "SourceFactId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Governance_ApprovalRules");

            migrationBuilder.DropTable(
                name: "Governance_Assignments");

            migrationBuilder.DropTable(
                name: "Governance_Capabilities");

            migrationBuilder.DropTable(
                name: "Governance_RoleCapabilities");

            migrationBuilder.DropTable(
                name: "Governance_Roles");

            migrationBuilder.DropTable(
                name: "StatutoryObligationFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_WorkSessionBoundaryFacts",
                table: "WorkSessionBoundaryFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ShiftAttributionFacts",
                table: "ShiftAttributionFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_OvertimeMarkerFacts",
                table: "OvertimeMarkerFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ManualWorkSessionAssertionFacts",
                table: "ManualWorkSessionAssertionFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LeaveFacts",
                table: "LeaveFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LeaveCancellationFacts",
                table: "LeaveCancellationFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ClockEventFacts",
                table: "ClockEventFacts");

            migrationBuilder.RenameTable(
                name: "WorkSessionBoundaryFacts",
                newName: "Time_WorkSessionBoundaryFacts");

            migrationBuilder.RenameTable(
                name: "ShiftAttributionFacts",
                newName: "Time_ShiftAttributionFacts");

            migrationBuilder.RenameTable(
                name: "OvertimeMarkerFacts",
                newName: "Time_OvertimeMarkerFacts");

            migrationBuilder.RenameTable(
                name: "ManualWorkSessionAssertionFacts",
                newName: "Time_ManualWorkSessionAssertionFacts");

            migrationBuilder.RenameTable(
                name: "LeaveFacts",
                newName: "Leave_LeaveFacts");

            migrationBuilder.RenameTable(
                name: "LeaveCancellationFacts",
                newName: "Leave_LeaveCancellationFacts");

            migrationBuilder.RenameTable(
                name: "ClockEventFacts",
                newName: "Time_ClockEventFacts");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Time_WorkSessionBoundaryFacts",
                table: "Time_WorkSessionBoundaryFacts",
                column: "WorkSessionBoundaryFactId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Time_ShiftAttributionFacts",
                table: "Time_ShiftAttributionFacts",
                column: "ShiftAttributionFactId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Time_OvertimeMarkerFacts",
                table: "Time_OvertimeMarkerFacts",
                column: "OvertimeMarkerFactId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Time_ManualWorkSessionAssertionFacts",
                table: "Time_ManualWorkSessionAssertionFacts",
                column: "ManualWorkSessionAssertionFactId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Leave_LeaveFacts",
                table: "Leave_LeaveFacts",
                column: "LeaveFactId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Leave_LeaveCancellationFacts",
                table: "Leave_LeaveCancellationFacts",
                column: "LeaveCancellationFactId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Time_ClockEventFacts",
                table: "Time_ClockEventFacts",
                column: "ClockEventFactId");

            migrationBuilder.CreateIndex(
                name: "IX_TimePeriods_PeriodDate",
                table: "TimePeriods",
                column: "PeriodDate",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PayrollFacts_PayrollRunId_EmployeeId_PayComponentId",
                table: "PayrollFacts",
                columns: new[] { "PayrollRunId", "EmployeeId", "PayComponentId" },
                unique: true);
        }
    }
}
