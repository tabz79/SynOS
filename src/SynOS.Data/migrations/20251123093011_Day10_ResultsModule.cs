using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.migrations
{
    /// <inheritdoc />
    public partial class Day10_ResultsModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AutosaveBuffers",
                columns: table => new
                {
                    BufferId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DraftJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SavedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AutosaveBuffers", x => x.BufferId);
                    table.ForeignKey(
                        name: "FK_AutosaveBuffers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DeltaCheckConfigs",
                columns: table => new
                {
                    ConfigId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ThresholdPercent = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeltaCheckConfigs", x => x.ConfigId);
                });

            migrationBuilder.CreateTable(
                name: "Results",
                columns: table => new
                {
                    ResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ReferenceRange = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Flag = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    TechComments = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EnteredByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EnteredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    VerifiedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    VerifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SignedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SignedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SupersededByResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Results", x => x.ResultId);
                    table.ForeignKey(
                        name: "FK_Results_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Results_Users_EnteredByUserId",
                        column: x => x.EnteredByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Results_Users_SignedByUserId",
                        column: x => x.SignedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Results_Users_VerifiedByUserId",
                        column: x => x.VerifiedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DeltaCheckEvents",
                columns: table => new
                {
                    EventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreviousResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreviousValue = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CurrentValue = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DeltaPercentage = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeltaCheckEvents", x => x.EventId);
                    table.ForeignKey(
                        name: "FK_DeltaCheckEvents_Results_PreviousResultId",
                        column: x => x.PreviousResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId");
                    table.ForeignKey(
                        name: "FK_DeltaCheckEvents_Results_ResultId",
                        column: x => x.ResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DeltaCheckEvents_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "ResultFlags",
                columns: table => new
                {
                    FlagId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FlagType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResultFlags", x => x.FlagId);
                    table.ForeignKey(
                        name: "FK_ResultFlags_Results_ResultId",
                        column: x => x.ResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ResultLinks",
                columns: table => new
                {
                    LinkId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FromResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ToResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Relation = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    LinkedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResultLinks", x => x.LinkId);
                    table.ForeignKey(
                        name: "FK_ResultLinks_Results_FromResultId",
                        column: x => x.FromResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResultLinks_Results_ToResultId",
                        column: x => x.ToResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AutosaveBuffers_UserId_EntityType_EntityId",
                table: "AutosaveBuffers",
                columns: new[] { "UserId", "EntityType", "EntityId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeltaCheckConfigs_ParameterCode",
                table: "DeltaCheckConfigs",
                column: "ParameterCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeltaCheckEvents_PreviousResultId",
                table: "DeltaCheckEvents",
                column: "PreviousResultId");

            migrationBuilder.CreateIndex(
                name: "IX_DeltaCheckEvents_ResultId",
                table: "DeltaCheckEvents",
                column: "ResultId");

            migrationBuilder.CreateIndex(
                name: "IX_DeltaCheckEvents_ReviewedByUserId",
                table: "DeltaCheckEvents",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ResultFlags_ResultId",
                table: "ResultFlags",
                column: "ResultId");

            migrationBuilder.CreateIndex(
                name: "IX_ResultLinks_FromResultId",
                table: "ResultLinks",
                column: "FromResultId");

            migrationBuilder.CreateIndex(
                name: "IX_ResultLinks_ToResultId",
                table: "ResultLinks",
                column: "ToResultId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_EnteredByUserId",
                table: "Results",
                column: "EnteredByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_OrderId_ParameterCode",
                table: "Results",
                columns: new[] { "OrderId", "ParameterCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Results_SignedByUserId",
                table: "Results",
                column: "SignedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_VerifiedByUserId",
                table: "Results",
                column: "VerifiedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AutosaveBuffers");

            migrationBuilder.DropTable(
                name: "DeltaCheckConfigs");

            migrationBuilder.DropTable(
                name: "DeltaCheckEvents");

            migrationBuilder.DropTable(
                name: "ResultFlags");

            migrationBuilder.DropTable(
                name: "ResultLinks");

            migrationBuilder.DropTable(
                name: "Results");
        }
    }
}
