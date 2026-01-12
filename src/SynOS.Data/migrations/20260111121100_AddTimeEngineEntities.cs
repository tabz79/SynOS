using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTimeEngineEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Time_ClockEventFacts",
                columns: table => new
                {
                    ClockEventFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EffectiveTimestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RecordedTimestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Action = table.Column<int>(type: "int", nullable: false),
                    LocationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Time_ClockEventFacts", x => x.ClockEventFactId);
                });

            migrationBuilder.CreateTable(
                name: "Time_ManualWorkSessionAssertionFacts",
                columns: table => new
                {
                    ManualWorkSessionAssertionFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EffectiveTimestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RecordedTimestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssertedStartTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AssertedEndTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReasonCode = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Time_ManualWorkSessionAssertionFacts", x => x.ManualWorkSessionAssertionFactId);
                });

            migrationBuilder.CreateTable(
                name: "Time_OvertimeMarkerFacts",
                columns: table => new
                {
                    OvertimeMarkerFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EffectiveTimestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RecordedTimestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EndTime = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Time_OvertimeMarkerFacts", x => x.OvertimeMarkerFactId);
                });

            migrationBuilder.CreateTable(
                name: "Time_ShiftAttributionFacts",
                columns: table => new
                {
                    ShiftAttributionFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EffectiveTimestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RecordedTimestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WorkSessionBoundaryFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShiftType = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Time_ShiftAttributionFacts", x => x.ShiftAttributionFactId);
                });

            migrationBuilder.CreateTable(
                name: "Time_WorkSessionBoundaryFacts",
                columns: table => new
                {
                    WorkSessionBoundaryFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RecordedTimestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PairedClockEventFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Time_WorkSessionBoundaryFacts", x => x.WorkSessionBoundaryFactId);
                });

            migrationBuilder.CreateTable(
                name: "TimePeriods",
                columns: table => new
                {
                    TimePeriodId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PeriodDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    LockedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimePeriods", x => x.TimePeriodId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimePeriods_PeriodDate",
                table: "TimePeriods",
                column: "PeriodDate",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Time_ClockEventFacts");

            migrationBuilder.DropTable(
                name: "Time_ManualWorkSessionAssertionFacts");

            migrationBuilder.DropTable(
                name: "Time_OvertimeMarkerFacts");

            migrationBuilder.DropTable(
                name: "Time_ShiftAttributionFacts");

            migrationBuilder.DropTable(
                name: "Time_WorkSessionBoundaryFacts");

            migrationBuilder.DropTable(
                name: "TimePeriods");
        }
    }
}
