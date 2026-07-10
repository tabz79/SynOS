using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOtaUpdateTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RolloutRing",
                table: "Labs",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "DeploymentEvents",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    DeploymentId = table.Column<string>(type: "TEXT", nullable: false),
                    EventType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    PayloadJson = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeploymentEvents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DeploymentPolicies",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    ReleaseId = table.Column<string>(type: "TEXT", nullable: false),
                    DeploymentTimeoutSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    HeartbeatTimeoutSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    RollbackThresholdPercentage = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeploymentPolicies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Deployments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    LabId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    ReleaseId = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Deployments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ReleasePackages",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    ReleaseId = table.Column<string>(type: "TEXT", nullable: false),
                    TargetArchitecture = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    PackageFileName = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    ChecksumSha256 = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    RequiredFreeSpaceBytes = table.Column<long>(type: "INTEGER", nullable: false),
                    SchemaVersion = table.Column<int>(type: "INTEGER", nullable: false),
                    Signature = table.Column<string>(type: "TEXT", nullable: true),
                    SignatureAlgorithm = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReleasePackages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Releases",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Version = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    ReleaseNotes = table.Column<string>(type: "TEXT", nullable: false),
                    RolloutRing = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    CanaryPercentage = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Releases", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Releases_Version",
                table: "Releases",
                column: "Version",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeploymentEvents");

            migrationBuilder.DropTable(
                name: "DeploymentPolicies");

            migrationBuilder.DropTable(
                name: "Deployments");

            migrationBuilder.DropTable(
                name: "ReleasePackages");

            migrationBuilder.DropTable(
                name: "Releases");

            migrationBuilder.DropColumn(
                name: "RolloutRing",
                table: "Labs");
        }
    }
}
