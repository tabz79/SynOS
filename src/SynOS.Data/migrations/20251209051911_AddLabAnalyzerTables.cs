using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLabAnalyzerTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LabAnalyzers",
                columns: table => new
                {
                    AnalyzerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrgId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Model = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Manufacturer = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ConnectionType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabAnalyzers", x => x.AnalyzerId);
                });

            migrationBuilder.CreateTable(
                name: "LabAnalyzerResultInbox",
                columns: table => new
                {
                    InboxId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyzerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RawMessage = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PatientIdentifier = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AnalyzerTestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ResultValue = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Units = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Flags = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MeasuredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SynosTestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ReceivedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ReviewedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabAnalyzerResultInbox", x => x.InboxId);
                    table.ForeignKey(
                        name: "FK_LabAnalyzerResultInbox_LabAnalyzers_AnalyzerId",
                        column: x => x.AnalyzerId,
                        principalTable: "LabAnalyzers",
                        principalColumn: "AnalyzerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerResultInbox_AnalyzerId",
                table: "LabAnalyzerResultInbox",
                column: "AnalyzerId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerResultInbox_OrderId",
                table: "LabAnalyzerResultInbox",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerResultInbox_PatientIdentifier",
                table: "LabAnalyzerResultInbox",
                column: "PatientIdentifier");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerResultInbox_ReceivedAt",
                table: "LabAnalyzerResultInbox",
                column: "ReceivedAt");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerResultInbox_Status",
                table: "LabAnalyzerResultInbox",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerResultInbox_VisitId",
                table: "LabAnalyzerResultInbox",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzers_BranchId",
                table: "LabAnalyzers",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzers_OrgId",
                table: "LabAnalyzers",
                column: "OrgId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LabAnalyzerResultInbox");

            migrationBuilder.DropTable(
                name: "LabAnalyzers");
        }
    }
}
