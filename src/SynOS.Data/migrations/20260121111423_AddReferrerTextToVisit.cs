using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReferrerTextToVisit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReferrerText",
                table: "Visits",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentCollectionModel",
                table: "ReferralPartners",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "Patients",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDateOfBirthKnown",
                table: "Patients",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "DiscountMasters",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "EffectiveFrom",
                table: "DiscountMasters",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EffectiveTo",
                table: "DiscountMasters",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Value",
                table: "DiscountMasters",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "SourceId",
                table: "BranchOperationalEvents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceType",
                table: "BranchOperationalEvents",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BranchOperationalStats",
                columns: table => new
                {
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PendingReportsCount = table.Column<int>(type: "int", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BranchOperationalStats", x => new { x.BranchId, x.Date });
                });

            migrationBuilder.CreateTable(
                name: "ProcessedProjectionEvents",
                columns: table => new
                {
                    EventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectionName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessedProjectionEvents", x => new { x.EventId, x.ProjectionName });
                });

            migrationBuilder.CreateTable(
                name: "UserOperationalStats",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    WalkInsCount = table.Column<int>(type: "int", nullable: false),
                    PaymentsTotal = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ReportTatTotalMinutes = table.Column<double>(type: "float", nullable: false),
                    ReportTatCount = table.Column<int>(type: "int", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserOperationalStats", x => new { x.UserId, x.BranchId, x.Date });
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReferralPayableFacts_SourceVisitId",
                table: "ReferralPayableFacts",
                column: "SourceVisitId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BranchOperationalStats_BranchId_Date",
                table: "BranchOperationalStats",
                columns: new[] { "BranchId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_ProcessedProjectionEvents_EventId",
                table: "ProcessedProjectionEvents",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_UserOperationalStats_UserId_BranchId_Date",
                table: "UserOperationalStats",
                columns: new[] { "UserId", "BranchId", "Date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BranchOperationalStats");

            migrationBuilder.DropTable(
                name: "ProcessedProjectionEvents");

            migrationBuilder.DropTable(
                name: "UserOperationalStats");

            migrationBuilder.DropIndex(
                name: "IX_ReferralPayableFacts_SourceVisitId",
                table: "ReferralPayableFacts");

            migrationBuilder.DropColumn(
                name: "ReferrerText",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "PaymentCollectionModel",
                table: "ReferralPartners");

            migrationBuilder.DropColumn(
                name: "DisplayName",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "IsDateOfBirthKnown",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "DiscountMasters");

            migrationBuilder.DropColumn(
                name: "EffectiveFrom",
                table: "DiscountMasters");

            migrationBuilder.DropColumn(
                name: "EffectiveTo",
                table: "DiscountMasters");

            migrationBuilder.DropColumn(
                name: "Value",
                table: "DiscountMasters");

            migrationBuilder.DropColumn(
                name: "SourceId",
                table: "BranchOperationalEvents");

            migrationBuilder.DropColumn(
                name: "SourceType",
                table: "BranchOperationalEvents");
        }
    }
}
