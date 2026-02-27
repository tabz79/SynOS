using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOperationalStatsProjectionColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompletedCollectionsCount",
                table: "UserOperationalStats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PendingCollectionsCount",
                table: "UserOperationalStats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PendingReportsCount",
                table: "UserOperationalStats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TestsRunningCount",
                table: "UserOperationalStats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CompletedCollectionsCount",
                table: "BranchOperationalStats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "PaymentsCashTotal",
                table: "BranchOperationalStats",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "PaymentsOnlineCount",
                table: "BranchOperationalStats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "PaymentsOnlineTotal",
                table: "BranchOperationalStats",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PaymentsTotal",
                table: "BranchOperationalStats",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "PendingCollectionsCount",
                table: "BranchOperationalStats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PrepaidBillsCount",
                table: "BranchOperationalStats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "PrepaidBillsTotal",
                table: "BranchOperationalStats",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ReportTatCount",
                table: "BranchOperationalStats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<double>(
                name: "ReportTatTotalMinutes",
                table: "BranchOperationalStats",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "TestsRunningCount",
                table: "BranchOperationalStats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "WalkInsCount",
                table: "BranchOperationalStats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "VisitOperationalStates",
                columns: table => new
                {
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignedReceptionistId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    WalkInActive = table.Column<bool>(type: "bit", nullable: false),
                    PendingReportsCount = table.Column<int>(type: "int", nullable: false),
                    PendingCollectionsCount = table.Column<int>(type: "int", nullable: false),
                    CompletedCollectionsCount = table.Column<int>(type: "int", nullable: false),
                    TestsRunningCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VisitOperationalStates", x => x.VisitId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VisitOperationalStates");

            migrationBuilder.DropColumn(
                name: "CompletedCollectionsCount",
                table: "UserOperationalStats");

            migrationBuilder.DropColumn(
                name: "PendingCollectionsCount",
                table: "UserOperationalStats");

            migrationBuilder.DropColumn(
                name: "PendingReportsCount",
                table: "UserOperationalStats");

            migrationBuilder.DropColumn(
                name: "TestsRunningCount",
                table: "UserOperationalStats");

            migrationBuilder.DropColumn(
                name: "CompletedCollectionsCount",
                table: "BranchOperationalStats");

            migrationBuilder.DropColumn(
                name: "PaymentsCashTotal",
                table: "BranchOperationalStats");

            migrationBuilder.DropColumn(
                name: "PaymentsOnlineCount",
                table: "BranchOperationalStats");

            migrationBuilder.DropColumn(
                name: "PaymentsOnlineTotal",
                table: "BranchOperationalStats");

            migrationBuilder.DropColumn(
                name: "PaymentsTotal",
                table: "BranchOperationalStats");

            migrationBuilder.DropColumn(
                name: "PendingCollectionsCount",
                table: "BranchOperationalStats");

            migrationBuilder.DropColumn(
                name: "PrepaidBillsCount",
                table: "BranchOperationalStats");

            migrationBuilder.DropColumn(
                name: "PrepaidBillsTotal",
                table: "BranchOperationalStats");

            migrationBuilder.DropColumn(
                name: "ReportTatCount",
                table: "BranchOperationalStats");

            migrationBuilder.DropColumn(
                name: "ReportTatTotalMinutes",
                table: "BranchOperationalStats");

            migrationBuilder.DropColumn(
                name: "TestsRunningCount",
                table: "BranchOperationalStats");

            migrationBuilder.DropColumn(
                name: "WalkInsCount",
                table: "BranchOperationalStats");
        }
    }
}
