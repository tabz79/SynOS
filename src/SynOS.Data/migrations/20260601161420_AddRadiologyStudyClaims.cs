using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRadiologyStudyClaims : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ActiveSessionId",
                table: "RadiologyStudies",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ClaimedAt",
                table: "RadiologyStudies",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ClaimedByUserId",
                table: "RadiologyStudies",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastActivityAt",
                table: "RadiologyStudies",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PriorStudyId",
                table: "RadiologyStudies",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsKeyImage",
                table: "PacsInstances",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "KeyImageNotes",
                table: "PacsInstances",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RadiologyDictationSessions",
                columns: table => new
                {
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TypistUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RadiologistUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SessionStatus = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    LiveDraftFindings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LiveDraftImpression = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LiveDraftNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AudioChannelState = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    EndedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyDictationSessions", x => x.SessionId);
                    table.ForeignKey(
                        name: "FK_RadiologyDictationSessions_RadiologyStudies_StudyId",
                        column: x => x.StudyId,
                        principalTable: "RadiologyStudies",
                        principalColumn: "RadiologyStudyId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyDictationSessions_Users_RadiologistUserId",
                        column: x => x.RadiologistUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RadiologyDictationSessions_Users_TypistUserId",
                        column: x => x.TypistUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyStudies_ClaimedByUserId",
                table: "RadiologyStudies",
                column: "ClaimedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyStudies_PriorStudyId",
                table: "RadiologyStudies",
                column: "PriorStudyId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyDictationSessions_RadiologistUserId",
                table: "RadiologyDictationSessions",
                column: "RadiologistUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyDictationSessions_StudyId",
                table: "RadiologyDictationSessions",
                column: "StudyId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyDictationSessions_TypistUserId",
                table: "RadiologyDictationSessions",
                column: "TypistUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_RadiologyStudies_RadiologyStudies_PriorStudyId",
                table: "RadiologyStudies",
                column: "PriorStudyId",
                principalTable: "RadiologyStudies",
                principalColumn: "RadiologyStudyId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RadiologyStudies_Users_ClaimedByUserId",
                table: "RadiologyStudies",
                column: "ClaimedByUserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RadiologyStudies_RadiologyStudies_PriorStudyId",
                table: "RadiologyStudies");

            migrationBuilder.DropForeignKey(
                name: "FK_RadiologyStudies_Users_ClaimedByUserId",
                table: "RadiologyStudies");

            migrationBuilder.DropTable(
                name: "RadiologyDictationSessions");

            migrationBuilder.DropIndex(
                name: "IX_RadiologyStudies_ClaimedByUserId",
                table: "RadiologyStudies");

            migrationBuilder.DropIndex(
                name: "IX_RadiologyStudies_PriorStudyId",
                table: "RadiologyStudies");

            migrationBuilder.DropColumn(
                name: "ActiveSessionId",
                table: "RadiologyStudies");

            migrationBuilder.DropColumn(
                name: "ClaimedAt",
                table: "RadiologyStudies");

            migrationBuilder.DropColumn(
                name: "ClaimedByUserId",
                table: "RadiologyStudies");

            migrationBuilder.DropColumn(
                name: "LastActivityAt",
                table: "RadiologyStudies");

            migrationBuilder.DropColumn(
                name: "PriorStudyId",
                table: "RadiologyStudies");

            migrationBuilder.DropColumn(
                name: "IsKeyImage",
                table: "PacsInstances");

            migrationBuilder.DropColumn(
                name: "KeyImageNotes",
                table: "PacsInstances");
        }
    }
}
