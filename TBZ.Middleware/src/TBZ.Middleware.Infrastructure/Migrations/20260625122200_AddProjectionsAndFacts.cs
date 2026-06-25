using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectionsAndFacts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_StoredEvents",
                table: "StoredEvents");

            migrationBuilder.AddColumn<long>(
                name: "Sequence",
                table: "StoredEvents",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0L)
                .Annotation("Sqlite:Autoincrement", true);

            migrationBuilder.AddColumn<string>(
                name: "AggregateId",
                table: "StoredEvents",
                type: "TEXT",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AggregateType",
                table: "StoredEvents",
                type: "TEXT",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_StoredEvents",
                table: "StoredEvents",
                column: "Sequence");

            migrationBuilder.CreateTable(
                name: "DailyOperationsFacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    PatientsRegistered = table.Column<int>(type: "INTEGER", nullable: false),
                    BillsCreated = table.Column<int>(type: "INTEGER", nullable: false),
                    RevenueCollected = table.Column<decimal>(type: "TEXT", nullable: false),
                    PaymentsCount = table.Column<int>(type: "INTEGER", nullable: false),
                    SamplesCollected = table.Column<int>(type: "INTEGER", nullable: false),
                    ReportsSigned = table.Column<int>(type: "INTEGER", nullable: false),
                    ReportsDelivered = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyOperationsFacts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DeliveryFacts",
                columns: table => new
                {
                    ReportId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DeliveryMethod = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    RequestedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DeliveredAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryFacts", x => x.ReportId);
                });

            migrationBuilder.CreateTable(
                name: "ProjectionCheckpoints",
                columns: table => new
                {
                    ProjectionName = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    LastProcessedSequence = table.Column<long>(type: "INTEGER", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectionCheckpoints", x => x.ProjectionName);
                });

            migrationBuilder.CreateTable(
                name: "TestVolumeFacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TestCode = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Department = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    VolumeCount = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TestVolumeFacts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkflowFacts",
                columns: table => new
                {
                    VisitId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    BranchId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    PatientRegisteredAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    VisitCreatedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    PaymentReceivedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    SampleCollectedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ProcessingStartedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ReportSignedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ReportDeliveredAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowFacts", x => x.VisitId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StoredEvents_Id",
                table: "StoredEvents",
                column: "Id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DailyOperationsFacts_LabId_Date",
                table: "DailyOperationsFacts",
                columns: new[] { "LabId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TestVolumeFacts_LabId_Date_TestCode",
                table: "TestVolumeFacts",
                columns: new[] { "LabId", "Date", "TestCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyOperationsFacts");

            migrationBuilder.DropTable(
                name: "DeliveryFacts");

            migrationBuilder.DropTable(
                name: "ProjectionCheckpoints");

            migrationBuilder.DropTable(
                name: "TestVolumeFacts");

            migrationBuilder.DropTable(
                name: "WorkflowFacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_StoredEvents",
                table: "StoredEvents");

            migrationBuilder.DropIndex(
                name: "IX_StoredEvents_Id",
                table: "StoredEvents");

            migrationBuilder.DropColumn(
                name: "Sequence",
                table: "StoredEvents");

            migrationBuilder.DropColumn(
                name: "AggregateId",
                table: "StoredEvents");

            migrationBuilder.DropColumn(
                name: "AggregateType",
                table: "StoredEvents");

            migrationBuilder.AddPrimaryKey(
                name: "PK_StoredEvents",
                table: "StoredEvents",
                column: "Id");
        }
    }
}
