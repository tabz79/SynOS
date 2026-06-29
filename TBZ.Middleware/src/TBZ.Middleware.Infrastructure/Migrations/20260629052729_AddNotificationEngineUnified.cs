using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationEngineUnified : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotificationInboxes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Sender = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    MessageId = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Channel = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Body = table.Column<string>(type: "TEXT", nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    RawPayload = table.Column<string>(type: "TEXT", nullable: false),
                    Processed = table.Column<bool>(type: "INTEGER", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationInboxes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NotificationMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CorrelationId = table.Column<string>(type: "TEXT", nullable: true),
                    Channel = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Recipient = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    TemplateName = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    VariablesJson = table.Column<string>(type: "TEXT", nullable: false),
                    MessageId = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    ConversationId = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    SentAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DeliveredAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ReadAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    FailedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationMessages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NotificationTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TemplateName = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Version = table.Column<int>(type: "INTEGER", nullable: false),
                    Language = table.Column<string>(type: "TEXT", nullable: false),
                    Category = table.Column<string>(type: "TEXT", nullable: false),
                    Approved = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastSyncedFromMeta = table.Column<DateTime>(type: "TEXT", nullable: true),
                    BodyPattern = table.Column<string>(type: "TEXT", nullable: false),
                    VariableMappingsJson = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NotificationWebhookEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    MessageId = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: true),
                    Phone = table.Column<string>(type: "TEXT", nullable: true),
                    ConversationId = table.Column<string>(type: "TEXT", nullable: true),
                    RawJson = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationWebhookEvents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NotificationOutboxes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    NotificationMessageId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Attempts = table.Column<int>(type: "INTEGER", nullable: false),
                    NextRetry = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LockedUntil = table.Column<DateTime>(type: "TEXT", nullable: true),
                    WorkerId = table.Column<string>(type: "TEXT", nullable: true),
                    LastError = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationOutboxes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationOutboxes_NotificationMessages_NotificationMessageId",
                        column: x => x.NotificationMessageId,
                        principalTable: "NotificationMessages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationInboxes_MessageId",
                table: "NotificationInboxes",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationMessages_MessageId",
                table: "NotificationMessages",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationOutboxes_NotificationMessageId",
                table: "NotificationOutboxes",
                column: "NotificationMessageId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationOutboxes_Status",
                table: "NotificationOutboxes",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationOutboxes_Status_NextRetry_LockedUntil",
                table: "NotificationOutboxes",
                columns: new[] { "Status", "NextRetry", "LockedUntil" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationTemplates_TemplateName_Version_Language",
                table: "NotificationTemplates",
                columns: new[] { "TemplateName", "Version", "Language" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NotificationWebhookEvents_MessageId",
                table: "NotificationWebhookEvents",
                column: "MessageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificationInboxes");

            migrationBuilder.DropTable(
                name: "NotificationOutboxes");

            migrationBuilder.DropTable(
                name: "NotificationTemplates");

            migrationBuilder.DropTable(
                name: "NotificationWebhookEvents");

            migrationBuilder.DropTable(
                name: "NotificationMessages");
        }
    }
}
