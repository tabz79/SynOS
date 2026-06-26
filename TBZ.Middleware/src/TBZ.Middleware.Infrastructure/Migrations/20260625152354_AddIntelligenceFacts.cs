using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIntelligenceFacts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DoctorReferralFacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DoctorId = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    DoctorName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    PatientCount = table.Column<int>(type: "INTEGER", nullable: false),
                    RevenueGenerated = table.Column<decimal>(type: "TEXT", nullable: false),
                    TestCount = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DoctorReferralFacts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PatientDemographicFacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AgeGroup = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Gender = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    PatientLocation = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    PatientPincode = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    PatientCount = table.Column<int>(type: "INTEGER", nullable: false),
                    Revenue = table.Column<decimal>(type: "TEXT", nullable: false),
                    TestCount = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientDemographicFacts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ReferralConversionFacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ReferralPartnerId = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    TotalReferredVisits = table.Column<int>(type: "INTEGER", nullable: false),
                    ConvertedVisits = table.Column<int>(type: "INTEGER", nullable: false),
                    Revenue = table.Column<decimal>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferralConversionFacts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ReferralPartnerFacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ReferralPartnerId = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    ReferralPartnerName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    ReferralPartnerLocation = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    PatientCount = table.Column<int>(type: "INTEGER", nullable: false),
                    RevenueGenerated = table.Column<decimal>(type: "TEXT", nullable: false),
                    TestCount = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferralPartnerFacts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TrendFacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EntityType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    EntityKey = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Count = table.Column<int>(type: "INTEGER", nullable: false),
                    Revenue = table.Column<decimal>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrendFacts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DoctorReferralFacts_LabId_Date_DoctorId",
                table: "DoctorReferralFacts",
                columns: new[] { "LabId", "Date", "DoctorId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PatientDemographicFacts_LabId_Date_AgeGroup_Gender_PatientLocation_PatientPincode",
                table: "PatientDemographicFacts",
                columns: new[] { "LabId", "Date", "AgeGroup", "Gender", "PatientLocation", "PatientPincode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReferralConversionFacts_LabId_Date_ReferralPartnerId",
                table: "ReferralConversionFacts",
                columns: new[] { "LabId", "Date", "ReferralPartnerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReferralPartnerFacts_LabId_Date_ReferralPartnerId",
                table: "ReferralPartnerFacts",
                columns: new[] { "LabId", "Date", "ReferralPartnerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TrendFacts_LabId_Date_EntityType_EntityKey",
                table: "TrendFacts",
                columns: new[] { "LabId", "Date", "EntityType", "EntityKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DoctorReferralFacts");

            migrationBuilder.DropTable(
                name: "PatientDemographicFacts");

            migrationBuilder.DropTable(
                name: "ReferralConversionFacts");

            migrationBuilder.DropTable(
                name: "ReferralPartnerFacts");

            migrationBuilder.DropTable(
                name: "TrendFacts");
        }
    }
}
