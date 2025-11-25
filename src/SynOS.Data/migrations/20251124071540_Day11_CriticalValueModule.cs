using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.migrations
{
    /// <inheritdoc />
    public partial class Day11_CriticalValueModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ReferrerId",
                table: "Visits",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CriticalRules",
                columns: table => new
                {
                    RuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CriticalLow = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    CriticalHigh = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    EscalationMinutes = table.Column<int>(type: "int", nullable: false),
                    RequireAcknowledgment = table.Column<bool>(type: "bit", nullable: false),
                    NotificationChannels = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CriticalRules", x => x.RuleId);
                });

            migrationBuilder.CreateTable(
                name: "Referrers",
                columns: table => new
                {
                    ReferrerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Referrers", x => x.ReferrerId);
                });

            migrationBuilder.CreateTable(
                name: "CriticalAlerts",
                columns: table => new
                {
                    AlertId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ParameterName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Value = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    CriticalThreshold = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferrerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TriggeredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    NotifiedTo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    NotifiedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    AcknowledgedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AcknowledgedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    AckMethod = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    AckNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EscalatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CriticalAlerts", x => x.AlertId);

                    // NO CASCADE here – avoid multiple cascade paths
                    table.ForeignKey(
                        name: "FK_CriticalAlerts_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "PatientId",
                        onDelete: ReferentialAction.Restrict);

                    table.ForeignKey(
                        name: "FK_CriticalAlerts_Referrers_ReferrerId",
                        column: x => x.ReferrerId,
                        principalTable: "Referrers",
                        principalColumn: "ReferrerId");

                    // NO CASCADE from Results -> CriticalAlerts
                    table.ForeignKey(
                        name: "FK_CriticalAlerts_Results_ResultId",
                        column: x => x.ResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId",
                        onDelete: ReferentialAction.Restrict);

                    table.ForeignKey(
                        name: "FK_CriticalAlerts_Users_AcknowledgedByUserId",
                        column: x => x.AcknowledgedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");

                    // NO CASCADE from Visits -> CriticalAlerts
                    table.ForeignKey(
                        name: "FK_CriticalAlerts_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Visits",
                        principalColumn: "VisitId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CriticalContacts",
                columns: table => new
                {
                    ContactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferrerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ContactName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CriticalContacts", x => x.ContactId);
                    table.ForeignKey(
                        name: "FK_CriticalContacts_Referrers_ReferrerId",
                        column: x => x.ReferrerId,
                        principalTable: "Referrers",
                        principalColumn: "ReferrerId");
                });

            migrationBuilder.CreateTable(
                name: "CriticalAudits",
                columns: table => new
                {
                    AuditId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AlertId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ActedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ActedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Details = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CriticalAudits", x => x.AuditId);

                    // Cascade from CriticalAlerts -> CriticalAudits is fine
                    table.ForeignKey(
                        name: "FK_CriticalAudits_CriticalAlerts_AlertId",
                        column: x => x.AlertId,
                        principalTable: "CriticalAlerts",
                        principalColumn: "AlertId",
                        onDelete: ReferentialAction.Cascade);

                    table.ForeignKey(
                        name: "FK_CriticalAudits_Users_ActedByUserId",
                        column: x => x.ActedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Visits_ReferrerId",
                table: "Visits",
                column: "ReferrerId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAlerts_AcknowledgedByUserId",
                table: "CriticalAlerts",
                column: "AcknowledgedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAlerts_PatientId",
                table: "CriticalAlerts",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAlerts_ReferrerId",
                table: "CriticalAlerts",
                column: "ReferrerId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAlerts_ResultId",
                table: "CriticalAlerts",
                column: "ResultId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAlerts_Status",
                table: "CriticalAlerts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAlerts_VisitId",
                table: "CriticalAlerts",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAudits_ActedByUserId",
                table: "CriticalAudits",
                column: "ActedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAudits_AlertId",
                table: "CriticalAudits",
                column: "AlertId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalContacts_ReferrerId",
                table: "CriticalContacts",
                column: "ReferrerId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalRules_ParameterCode",
                table: "CriticalRules",
                column: "ParameterCode",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Visits_Referrers_ReferrerId",
                table: "Visits",
                column: "ReferrerId",
                principalTable: "Referrers",
                principalColumn: "ReferrerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Visits_Referrers_ReferrerId",
                table: "Visits");

            migrationBuilder.DropTable(
                name: "CriticalAudits");

            migrationBuilder.DropTable(
                name: "CriticalContacts");

            migrationBuilder.DropTable(
                name: "CriticalRules");

            migrationBuilder.DropTable(
                name: "CriticalAlerts");

            migrationBuilder.DropTable(
                name: "Referrers");

            migrationBuilder.DropIndex(
                name: "IX_Visits_ReferrerId",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "ReferrerId",
                table: "Visits");
        }
    }
}
