using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class Phase1A_BranchIsolation_v2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Add DefaultBranchId to Users
            migrationBuilder.AddColumn<Guid>(
                name: "DefaultBranchId",
                table: "Users",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_DefaultBranchId",
                table: "Users",
                column: "DefaultBranchId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Branches_DefaultBranchId",
                table: "Users",
                column: "DefaultBranchId",
                principalTable: "Branches",
                principalColumn: "BranchId",
                onDelete: ReferentialAction.SetNull);

            // 2. Add BranchId to OperationalResources (Initial Nullable)
            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "OperationalResources",
                type: "uniqueidentifier",
                nullable: true);

            // 3. SQL Backfill Logic
            migrationBuilder.Sql(@"
                -- A. Populate DefaultBranchId for users with exactly ONE branch role
                UPDATE u
                SET u.DefaultBranchId = (
                    SELECT BranchId FROM UserBranchRoles ubr WHERE ubr.UserId = u.UserId
                )
                FROM Users u
                WHERE (SELECT COUNT(*) FROM UserBranchRoles WHERE UserId = u.UserId) = 1;

                -- B. Backfill OperationalResources from DefaultBranchId
                UPDATE orsc
                SET orsc.BranchId = u.DefaultBranchId
                FROM OperationalResources orsc
                JOIN Users u ON orsc.UserId = u.UserId
                WHERE u.DefaultBranchId IS NOT NULL;

                -- C. Validation Check: No OperationalResource can be left unmapped
                IF EXISTS (SELECT 1 FROM OperationalResources WHERE BranchId IS NULL)
                BEGIN
                    RAISERROR('Migration Failed: One or more OperationalResources could not be uniquely mapped to a BranchId. Manual DefaultBranchId required for some users.', 16, 1);
                    RETURN;
                END
            ");

            // 4. Finalize Schema
            migrationBuilder.AlterColumn<Guid>(
                name: "BranchId",
                table: "OperationalResources",
                type: "uniqueidentifier",
                nullable: false);

            migrationBuilder.CreateIndex(
                name: "IX_OperationalResources_BranchId_Department",
                table: "OperationalResources",
                columns: new[] { "BranchId", "Department" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Branches_DefaultBranchId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_OperationalResources_BranchId_Department",
                table: "OperationalResources");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "OperationalResources");

            migrationBuilder.DropIndex(
                name: "IX_Users_DefaultBranchId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DefaultBranchId",
                table: "Users");
        }
    }
}
