using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class CreateProcessingAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProcessingAssignments",
                columns: table => new
                {
                    ProcessingAssignmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SpecimenId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AssignedResourceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessingAssignments", x => x.ProcessingAssignmentId);
                    table.ForeignKey(
                        name: "FK_ProcessingAssignments_OperationalResources_AssignedResourceId",
                        column: x => x.AssignedResourceId,
                        principalTable: "OperationalResources",
                        principalColumn: "OperationalResourceId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProcessingAssignments_Specimens_SpecimenId",
                        column: x => x.SpecimenId,
                        principalTable: "Specimens",
                        principalColumn: "SpecimenId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProcessingAssignments_AssignedResourceId",
                table: "ProcessingAssignments",
                column: "AssignedResourceId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcessingAssignments_BranchId_DepartmentCode_Status",
                table: "ProcessingAssignments",
                columns: new[] { "BranchId", "DepartmentCode", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProcessingAssignments_SpecimenId_DepartmentCode",
                table: "ProcessingAssignments",
                columns: new[] { "SpecimenId", "DepartmentCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProcessingAssignments");
        }
    }
}
