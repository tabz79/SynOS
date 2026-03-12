using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogProvisioningSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CatalogProvisioningLocks",
                columns: table => new
                {
                    LockId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IsLocked = table.Column<bool>(type: "bit", nullable: false),
                    LockedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockedBySessionId = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogProvisioningLocks", x => x.LockId);
                });

            migrationBuilder.CreateTable(
                name: "CatalogProvisioningLogs",
                columns: table => new
                {
                    ProvisionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    IsDryRun = table.Column<bool>(type: "bit", nullable: false),
                    CatalogVersionHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TestsAffected = table.Column<int>(type: "int", nullable: false),
                    ParametersAffected = table.Column<int>(type: "int", nullable: false),
                    MappingsAffected = table.Column<int>(type: "int", nullable: false),
                    PricingChanges = table.Column<int>(type: "int", nullable: false),
                    AffectedTestCodes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogProvisioningLogs", x => x.ProvisionId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CatalogProvisioningLocks");

            migrationBuilder.DropTable(
                name: "CatalogProvisioningLogs");
        }
    }
}
