using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVisitOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AssignedReceptionistId",
                table: "Visits",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "Visits",
                type: "uniqueidentifier",
                nullable: true);

            // Backfill logic
            migrationBuilder.Sql(@"
                -- 1. Try to backfill from earliest operational event
                -- Note: VisitId in BranchOperationalEvents is a string, in Visits it is a Guid
                -- We JOIN with Users to ensure the SourceId actually exists (avoiding FK conflicts)
                UPDATE Visits
                SET CreatedByUserId = (
                    SELECT TOP 1 SourceId 
                    FROM BranchOperationalEvents boe 
                    JOIN Users u ON boe.SourceId = u.UserId
                    WHERE boe.VisitId = CAST(Visits.VisitId AS NVARCHAR(36)) 
                      AND boe.ActorType = 'User'
                      AND boe.SourceId IS NOT NULL
                    ORDER BY OccurredAt ASC
                ),
                AssignedReceptionistId = (
                    SELECT TOP 1 SourceId 
                    FROM BranchOperationalEvents boe 
                    JOIN Users u ON boe.SourceId = u.UserId
                    WHERE boe.VisitId = CAST(Visits.VisitId AS NVARCHAR(36)) 
                      AND boe.ActorType = 'User'
                      AND boe.SourceId IS NOT NULL
                    ORDER BY OccurredAt ASC
                )
                WHERE CreatedByUserId IS NULL;

                -- 2. Fallback to first available Admin if no event found
                DECLARE @FallbackUserId UNIQUEIDENTIFIER;
                SELECT TOP 1 @FallbackUserId = ur.UserId 
                FROM UserRoles ur 
                JOIN Roles r ON ur.RoleId = r.RoleId 
                WHERE r.Name LIKE '%Admin%';

                -- 3. If still no fallback, pick any user (to avoid nulls if required, but they are nullable for now)
                IF @FallbackUserId IS NULL
                BEGIN
                    SELECT TOP 1 @FallbackUserId = UserId FROM Users;
                END

                UPDATE Visits
                SET CreatedByUserId = @FallbackUserId,
                    AssignedReceptionistId = @FallbackUserId
                WHERE CreatedByUserId IS NULL AND @FallbackUserId IS NOT NULL;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Visits_AssignedReceptionistId",
                table: "Visits",
                column: "AssignedReceptionistId");

            migrationBuilder.CreateIndex(
                name: "IX_Visits_CreatedByUserId",
                table: "Visits",
                column: "CreatedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Visits_Users_AssignedReceptionistId",
                table: "Visits",
                column: "AssignedReceptionistId",
                principalTable: "Users",
                principalColumn: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Visits_Users_CreatedByUserId",
                table: "Visits",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Visits_Users_AssignedReceptionistId",
                table: "Visits");

            migrationBuilder.DropForeignKey(
                name: "FK_Visits_Users_CreatedByUserId",
                table: "Visits");

            migrationBuilder.DropIndex(
                name: "IX_Visits_AssignedReceptionistId",
                table: "Visits");

            migrationBuilder.DropIndex(
                name: "IX_Visits_CreatedByUserId",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "AssignedReceptionistId",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Visits");
        }
    }
}
