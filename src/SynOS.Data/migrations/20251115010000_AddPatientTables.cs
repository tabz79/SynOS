using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.migrations
{
    public partial class AddPatientTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Patients",
                columns: table => new
                {
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MRN = table.Column<string>(type: "nvarchar(6)", maxLength: 6, nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateOfBirth = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Gender = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    CurrentPhoneNumber = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    IsSoftDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Patients", x => x.PatientId);
                });

            migrationBuilder.CreateTable(
                name: "PatientAliases",
                columns: table => new
                {
                    AliasId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientAliases", x => x.AliasId);
                    table.ForeignKey(
                        name: "FK_PatientAliases_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "PatientId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PatientPhoneHistories",
                columns: table => new
                {
                    PhoneHistoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientPhoneHistories", x => x.PhoneHistoryId);
                    table.ForeignKey(
                        name: "FK_PatientPhoneHistories_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "PatientId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PatientReferrerLinks",
                columns: table => new
                {
                    ReferrerLinkId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferrerSystem = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ReferrerPatientId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientReferrerLinks", x => x.ReferrerLinkId);
                    table.ForeignKey(
                        name: "FK_PatientReferrerLinks_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "PatientId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PatientAliases_PatientId",
                table: "PatientAliases",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientPhoneHistories_PatientId",
                table: "PatientPhoneHistories",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientPhoneHistories_PhoneNumber",
                table: "PatientPhoneHistories",
                column: "PhoneNumber");

            migrationBuilder.CreateIndex(
                name: "IX_PatientReferrerLinks_PatientId",
                table: "PatientReferrerLinks",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientReferrerLinks_ReferrerSystem_ReferrerPatientId",
                table: "PatientReferrerLinks",
                columns: new[] { "ReferrerSystem", "ReferrerPatientId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_CurrentPhoneNumber",
                table: "Patients",
                column: "CurrentPhoneNumber");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_MRN",
                table: "Patients",
                column: "MRN",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PatientAliases");

            migrationBuilder.DropTable(
                name: "PatientPhoneHistories");

            migrationBuilder.DropTable(
                name: "PatientReferrerLinks");

            migrationBuilder.DropTable(
                name: "Patients");
        }
    }
}
