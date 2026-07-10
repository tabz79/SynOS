using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDiagnosticsBundles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DiagnosticsBundles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    FolderPath = table.Column<string>(type: "TEXT", nullable: true),
                    ErrorMessage = table.Column<string>(type: "TEXT", nullable: true),
                    ReceivedChunks = table.Column<int>(type: "INTEGER", nullable: false),
                    TotalChunks = table.Column<int>(type: "INTEGER", nullable: false),
                    BundleSizeBytes = table.Column<long>(type: "INTEGER", nullable: false),
                    ChecksumSha256 = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiagnosticsBundles", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DiagnosticsBundles");
        }
    }
}
