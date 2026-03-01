using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class Phase1A_Hardening_Final : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Specimens_Visits_VisitId1",
                table: "Specimens");

            migrationBuilder.DropIndex(
                name: "IX_Specimens_VisitId1",
                table: "Specimens");

            migrationBuilder.DropColumn(
                name: "VisitId1",
                table: "Specimens");

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "OperationalResources",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.CreateIndex(
                name: "IX_OperationalResources_UserId_ActiveSessionId",
                table: "OperationalResources",
                columns: new[] { "UserId", "ActiveSessionId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_OperationalResources_UserId_ActiveSessionId",
                table: "OperationalResources");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "OperationalResources");

            migrationBuilder.AddColumn<Guid>(
                name: "VisitId1",
                table: "Specimens",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Specimens_VisitId1",
                table: "Specimens",
                column: "VisitId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Specimens_Visits_VisitId1",
                table: "Specimens",
                column: "VisitId1",
                principalTable: "Visits",
                principalColumn: "VisitId");
        }
    }
}
