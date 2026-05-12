using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class CompleteReferralSystemSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "Visits",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AlterColumn<decimal>(
                name: "AmountPaid",
                schema: "Payables",
                table: "VendorPayables",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "AmountPaid",
                table: "ReferralPayableFacts",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "ReferralPayableFacts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ApprovedAt",
                table: "ReferralPartners",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ApprovedByUserId",
                table: "ReferralPartners",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CalculationBase",
                table: "ReferralPartners",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ClinicName",
                table: "ReferralPartners",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DefaultCommissionPercentage",
                table: "ReferralPartners",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "ReferralPartners",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "ReferralPartners",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<decimal>(
                name: "AmountReceived",
                schema: "AR",
                table: "ReceivableFacts",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "BaseAmount",
                table: "PayStructureComponents",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.CreateTable(
                name: "ReferralApprovalLogs",
                columns: table => new
                {
                    LogId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PartnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ApprovedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommissionPercentageAssigned = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    BackfilledVisitCount = table.Column<int>(type: "int", nullable: false),
                    Timestamp = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferralApprovalLogs", x => x.LogId);
                    table.ForeignKey(
                        name: "FK_ReferralApprovalLogs_ReferralPartners_PartnerId",
                        column: x => x.PartnerId,
                        principalTable: "ReferralPartners",
                        principalColumn: "ReferralPartnerId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReferralApprovalLogs_PartnerId",
                table: "ReferralApprovalLogs",
                column: "PartnerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReferralApprovalLogs");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "ReferralPayableFacts");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "ReferralPartners");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "ReferralPartners");

            migrationBuilder.DropColumn(
                name: "CalculationBase",
                table: "ReferralPartners");

            migrationBuilder.DropColumn(
                name: "ClinicName",
                table: "ReferralPartners");

            migrationBuilder.DropColumn(
                name: "DefaultCommissionPercentage",
                table: "ReferralPartners");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "ReferralPartners");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "ReferralPartners");

            migrationBuilder.AlterColumn<decimal>(
                name: "AmountPaid",
                schema: "Payables",
                table: "VendorPayables",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.AlterColumn<decimal>(
                name: "AmountPaid",
                table: "ReferralPayableFacts",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.AlterColumn<decimal>(
                name: "AmountReceived",
                schema: "AR",
                table: "ReceivableFacts",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.AlterColumn<decimal>(
                name: "BaseAmount",
                table: "PayStructureComponents",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");
        }
    }
}
