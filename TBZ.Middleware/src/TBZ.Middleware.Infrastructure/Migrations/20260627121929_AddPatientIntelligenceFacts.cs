using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPatientIntelligenceFacts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PatientIntelligenceFacts",
                columns: table => new
                {
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    MRN = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    PatientName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    DateOfBirth = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Gender = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    MobileNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    ReferringDoctorOrPartner = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    TotalVisits = table.Column<int>(type: "INTEGER", nullable: false),
                    LifetimeRevenue = table.Column<decimal>(type: "TEXT", nullable: false),
                    FirstVisitDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastVisitDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastVisitedBranchId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientIntelligenceFacts", x => x.PatientId);
                });

            migrationBuilder.CreateTable(
                name: "PatientVisitFacts",
                columns: table => new
                {
                    VisitId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Token = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    VisitDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TestsJson = table.Column<string>(type: "TEXT", nullable: false),
                    AmountPaid = table.Column<decimal>(type: "TEXT", nullable: false),
                    ReferringDoctorOrPartner = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientVisitFacts", x => x.VisitId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PatientIntelligenceFacts");

            migrationBuilder.DropTable(
                name: "PatientVisitFacts");
        }
    }
}
