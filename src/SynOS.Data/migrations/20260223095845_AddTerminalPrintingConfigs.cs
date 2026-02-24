using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTerminalPrintingConfigs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BranchPrinters",
                columns: table => new
                {
                    PrinterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PrinterName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PrinterType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BranchPrinters", x => x.PrinterId);
                    table.ForeignKey(
                        name: "FK_BranchPrinters_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TerminalPrinterConfigs",
                columns: table => new
                {
                    TerminalIdentifier = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsLeadPrintTerminal = table.Column<bool>(type: "bit", nullable: false),
                    SpecificReceiptPrinterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TerminalPrinterConfigs", x => x.TerminalIdentifier);
                    table.ForeignKey(
                        name: "FK_TerminalPrinterConfigs_BranchPrinters_SpecificReceiptPrinterId",
                        column: x => x.SpecificReceiptPrinterId,
                        principalTable: "BranchPrinters",
                        principalColumn: "PrinterId");
                    table.ForeignKey(
                        name: "FK_TerminalPrinterConfigs_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BranchPrinters_BranchId",
                table: "BranchPrinters",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_TerminalPrinterConfigs_BranchId",
                table: "TerminalPrinterConfigs",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_TerminalPrinterConfigs_SpecificReceiptPrinterId",
                table: "TerminalPrinterConfigs",
                column: "SpecificReceiptPrinterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TerminalPrinterConfigs");

            migrationBuilder.DropTable(
                name: "BranchPrinters");
        }
    }
}
