using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBusinessSourceFact : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BusinessSourceFacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    SourceType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    SourceId = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    SourceName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    IsFirstVisit = table.Column<bool>(type: "INTEGER", nullable: false),
                    PatientCount = table.Column<int>(type: "INTEGER", nullable: false),
                    RevenueGenerated = table.Column<decimal>(type: "TEXT", nullable: false),
                    TestCount = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessSourceFacts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessSourceFacts_LabId_Date_SourceType_SourceId_IsFirstVisit",
                table: "BusinessSourceFacts",
                columns: new[] { "LabId", "Date", "SourceType", "SourceId", "IsFirstVisit" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BusinessSourceFacts");
        }
    }
}
