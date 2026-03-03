using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class SnapshotFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Specimens_Visits_VisitId",
                table: "Specimens");

            migrationBuilder.DropTable(
                name: "AccessionSequences");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AccessionCounters",
                table: "AccessionCounters");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "AccessionCounters");

            migrationBuilder.DropColumn(
                name: "Day",
                table: "AccessionCounters");

            migrationBuilder.DropColumn(
                name: "Prefix",
                table: "AccessionCounters");

            migrationBuilder.RenameColumn(
                name: "LastNumber",
                table: "AccessionCounters",
                newName: "LastSequence");

            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "WorkAssignments",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<DateTime>(
                name: "ClaimedAt",
                table: "WorkAssignments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CollectedBy",
                table: "Specimens",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "AccessionCounters",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<DateOnly>(
                name: "Date",
                table: "AccessionCounters",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "AccessionCounters",
                type: "rowversion",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_AccessionCounters",
                table: "AccessionCounters",
                columns: new[] { "BranchId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Specimens_CollectedBy",
                table: "Specimens",
                column: "CollectedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Specimens_CollectedByUserId",
                table: "Specimens",
                column: "CollectedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Specimens_OperationalResources_CollectedBy",
                table: "Specimens",
                column: "CollectedBy",
                principalTable: "OperationalResources",
                principalColumn: "OperationalResourceId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Specimens_Users_CollectedByUserId",
                table: "Specimens",
                column: "CollectedByUserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Specimens_Visits_VisitId",
                table: "Specimens",
                column: "VisitId",
                principalTable: "Visits",
                principalColumn: "VisitId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Specimens_OperationalResources_CollectedBy",
                table: "Specimens");

            migrationBuilder.DropForeignKey(
                name: "FK_Specimens_Users_CollectedByUserId",
                table: "Specimens");

            migrationBuilder.DropForeignKey(
                name: "FK_Specimens_Visits_VisitId",
                table: "Specimens");

            migrationBuilder.DropIndex(
                name: "IX_Specimens_CollectedBy",
                table: "Specimens");

            migrationBuilder.DropIndex(
                name: "IX_Specimens_CollectedByUserId",
                table: "Specimens");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AccessionCounters",
                table: "AccessionCounters");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "WorkAssignments");

            migrationBuilder.DropColumn(
                name: "ClaimedAt",
                table: "WorkAssignments");

            migrationBuilder.DropColumn(
                name: "CollectedBy",
                table: "Specimens");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "AccessionCounters");

            migrationBuilder.DropColumn(
                name: "Date",
                table: "AccessionCounters");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "AccessionCounters");

            migrationBuilder.RenameColumn(
                name: "LastSequence",
                table: "AccessionCounters",
                newName: "LastNumber");

            migrationBuilder.AddColumn<int>(
                name: "Id",
                table: "AccessionCounters",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<DateTime>(
                name: "Day",
                table: "AccessionCounters",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Prefix",
                table: "AccessionCounters",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AccessionCounters",
                table: "AccessionCounters",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "AccessionSequences",
                columns: table => new
                {
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastSequenceNumber = table.Column<int>(type: "int", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccessionSequences", x => new { x.BranchId, x.Date });
                });

            migrationBuilder.AddForeignKey(
                name: "FK_Specimens_Visits_VisitId",
                table: "Specimens",
                column: "VisitId",
                principalTable: "Visits",
                principalColumn: "VisitId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
