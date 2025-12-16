using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchEntityAndLinkToVisit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Create the Branches table first.
            migrationBuilder.CreateTable(
                name: "Branches",
                columns: table => new
                {
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Branches", x => x.BranchId);
                });

            // Step 2: Seed the default branch data directly in the migration.
            migrationBuilder.Sql("INSERT INTO Branches (BranchId, Name, IsActive) VALUES ('A0000000-0000-0000-0000-000000000001', 'Main Laboratory', 1)");

            // Step 3: Add the nullable column to Visits.
            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "Visits",
                type: "uniqueidentifier",
                nullable: true);

            // Step 4: Backfill existing Visit rows with the default BranchId.
            migrationBuilder.Sql("UPDATE Visits SET BranchId = 'A0000000-0000-0000-0000-000000000001' WHERE BranchId IS NULL");

            // Step 5: Create indexes.
            migrationBuilder.CreateIndex(
                name: "IX_Visits_BranchId",
                table: "Visits",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_Name",
                table: "Branches",
                column: "Name",
                unique: true);

            // Step 6: Add the foreign key constraint, which will now succeed.
            migrationBuilder.AddForeignKey(
                name: "FK_Visits_Branches_BranchId",
                table: "Visits",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "BranchId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Visits_Branches_BranchId",
                table: "Visits");

            migrationBuilder.DropTable(
                name: "Branches");

            migrationBuilder.DropIndex(
                name: "IX_Visits_BranchId",
                table: "Visits");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "Visits");
        }
    }
}
