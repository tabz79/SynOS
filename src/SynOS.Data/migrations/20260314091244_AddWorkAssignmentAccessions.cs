using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkAssignmentAccessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkAssignmentAccessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WorkAssignmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SpecimenType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TubeCount = table.Column<int>(type: "int", nullable: false),
                    AccessionNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Sequence = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkAssignmentAccessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkAssignmentAccessions_WorkAssignments_WorkAssignmentId",
                        column: x => x.WorkAssignmentId,
                        principalTable: "WorkAssignments",
                        principalColumn: "AssignmentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkAssignmentAccessions_AccessionNumber",
                table: "WorkAssignmentAccessions",
                column: "AccessionNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkAssignmentAccessions_WorkAssignmentId",
                table: "WorkAssignmentAccessions",
                column: "WorkAssignmentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkAssignmentAccessions");
        }
    }
}
