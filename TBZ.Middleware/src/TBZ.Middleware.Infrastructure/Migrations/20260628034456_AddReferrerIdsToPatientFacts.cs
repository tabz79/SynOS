using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReferrerIdsToPatientFacts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ReferralPartnerId",
                table: "PatientVisitFacts",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReferringDoctorId",
                table: "PatientVisitFacts",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReferralPartnerId",
                table: "PatientIntelligenceFacts",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReferringDoctorId",
                table: "PatientIntelligenceFacts",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReferralPartnerId",
                table: "PatientVisitFacts");

            migrationBuilder.DropColumn(
                name: "ReferringDoctorId",
                table: "PatientVisitFacts");

            migrationBuilder.DropColumn(
                name: "ReferralPartnerId",
                table: "PatientIntelligenceFacts");

            migrationBuilder.DropColumn(
                name: "ReferringDoctorId",
                table: "PatientIntelligenceFacts");
        }
    }
}
