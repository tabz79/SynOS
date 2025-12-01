using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.migrations
{
    /// <inheritdoc />
    public partial class AddReportSignatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SignatureImageUrl",
                table: "Users",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SignatureUpdatedAt",
                table: "Users",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ReportSignatures",
                columns: table => new
                {
                    ReportSignatureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    SignatureImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SignatureHash = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ReportVersion = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportSignatures", x => x.ReportSignatureId);
                    table.ForeignKey(
                        name: "FK_ReportSignatures_Reports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "Reports",
                        principalColumn: "ReportId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReportSignatures_Users_SignedByUserId",
                        column: x => x.SignedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReportSignatures_ReportId",
                table: "ReportSignatures",
                column: "ReportId");

            migrationBuilder.CreateIndex(
                name: "IX_ReportSignatures_SignedByUserId",
                table: "ReportSignatures",
                column: "SignedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReportSignatures");

            migrationBuilder.DropColumn(
                name: "SignatureImageUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SignatureUpdatedAt",
                table: "Users");
        }
    }
}
