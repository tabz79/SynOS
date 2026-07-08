using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRemoteOpsAndSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ActiveVersion",
                table: "Labs",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DotNetVersion",
                table: "Labs",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "GeographicalRegion",
                table: "Labs",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "HardwareToken",
                table: "Labs",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSeenAt",
                table: "Labs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OSVersion",
                table: "Labs",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "CommandDirectives",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    CommandType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    PayloadJson = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DispatchedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ExecutedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommandDirectives", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HealthSnapshots",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CpuUsagePercent = table.Column<double>(type: "REAL", nullable: false),
                    MemoryUsageMB = table.Column<double>(type: "REAL", nullable: false),
                    DiskFreeSpaceGB = table.Column<double>(type: "REAL", nullable: false),
                    PendingOutboxCount = table.Column<int>(type: "INTEGER", nullable: false),
                    DeadLetterCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HealthSnapshots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "KnownIssues",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    DiagnosticFingerprint = table.Column<string>(type: "TEXT", nullable: false),
                    RootCause = table.Column<string>(type: "TEXT", nullable: false),
                    Workaround = table.Column<string>(type: "TEXT", nullable: false),
                    FixedVersion = table.Column<string>(type: "TEXT", nullable: false),
                    AffectedVersions = table.Column<string>(type: "TEXT", nullable: false),
                    ResolutionPackage = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KnownIssues", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SupportCases",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CaseNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Priority = table.Column<string>(type: "TEXT", nullable: false),
                    Category = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupportCases", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SupportTickets",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Priority = table.Column<string>(type: "TEXT", nullable: false),
                    Category = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DiagnosticBundleId = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    SupportCaseId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupportTickets", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CommandDirectives");

            migrationBuilder.DropTable(
                name: "HealthSnapshots");

            migrationBuilder.DropTable(
                name: "KnownIssues");

            migrationBuilder.DropTable(
                name: "SupportCases");

            migrationBuilder.DropTable(
                name: "SupportTickets");

            migrationBuilder.DropColumn(
                name: "ActiveVersion",
                table: "Labs");

            migrationBuilder.DropColumn(
                name: "DotNetVersion",
                table: "Labs");

            migrationBuilder.DropColumn(
                name: "GeographicalRegion",
                table: "Labs");

            migrationBuilder.DropColumn(
                name: "HardwareToken",
                table: "Labs");

            migrationBuilder.DropColumn(
                name: "LastSeenAt",
                table: "Labs");

            migrationBuilder.DropColumn(
                name: "OSVersion",
                table: "Labs");
        }
    }
}
