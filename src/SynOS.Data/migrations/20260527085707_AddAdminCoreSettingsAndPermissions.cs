using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminCoreSettingsAndPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "BackupEnabled",
                table: "LabProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "BackupFrequency",
                table: "LabProfiles",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BackupPath",
                table: "LabProfiles",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BackupTime",
                table: "LabProfiles",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DefaultTaxPercent",
                table: "LabProfiles",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "EnableQrPayment",
                table: "LabProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "FooterMarginMm",
                table: "LabProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HeaderHeightMm",
                table: "LabProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "InvoicePrefix",
                table: "LabProfiles",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "NextInvoiceNumber",
                table: "LabProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "ShowDigitalSignatures",
                table: "LabProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowHeaderOnReports",
                table: "LabProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowWatermark",
                table: "LabProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SmsApiKey",
                table: "LabProfiles",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmsGatewayProvider",
                table: "LabProfiles",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SmtpEnableSsl",
                table: "LabProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SmtpHost",
                table: "LabProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmtpPassword",
                table: "LabProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SmtpPort",
                table: "LabProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SmtpSenderEmail",
                table: "LabProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmtpSenderName",
                table: "LabProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmtpUsername",
                table: "LabProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpiId",
                table: "LabProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppApiKey",
                table: "LabProfiles",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppGatewayUrl",
                table: "LabProfiles",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RoleDepartmentConfigs",
                columns: table => new
                {
                    ConfigId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoleName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OperatingHoursStart = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    OperatingHoursEnd = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    DefaultTATHours = table.Column<int>(type: "int", nullable: false),
                    CanSearchAll = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleDepartmentConfigs", x => x.ConfigId);
                    table.ForeignKey(
                        name: "FK_RoleDepartmentConfigs_DepartmentMasters_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "DepartmentMasters",
                        principalColumn: "DepartmentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RoleDepartmentConfigs_DepartmentId",
                table: "RoleDepartmentConfigs",
                column: "DepartmentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RoleDepartmentConfigs");

            migrationBuilder.DropColumn(
                name: "BackupEnabled",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "BackupFrequency",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "BackupPath",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "BackupTime",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "DefaultTaxPercent",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "EnableQrPayment",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "FooterMarginMm",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "HeaderHeightMm",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "InvoicePrefix",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "NextInvoiceNumber",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "ShowDigitalSignatures",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "ShowHeaderOnReports",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "ShowWatermark",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "SmsApiKey",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "SmsGatewayProvider",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "SmtpEnableSsl",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "SmtpHost",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "SmtpPassword",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "SmtpPort",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "SmtpSenderEmail",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "SmtpSenderName",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "SmtpUsername",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "UpiId",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "WhatsAppApiKey",
                table: "LabProfiles");

            migrationBuilder.DropColumn(
                name: "WhatsAppGatewayUrl",
                table: "LabProfiles");
        }
    }
}
