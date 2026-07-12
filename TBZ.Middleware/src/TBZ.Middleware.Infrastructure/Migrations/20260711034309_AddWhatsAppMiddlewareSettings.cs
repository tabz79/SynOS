using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWhatsAppMiddlewareSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WhatsAppAccessToken",
                table: "MiddlewareSettings",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppActiveTemplateName",
                table: "MiddlewareSettings",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppAppSecret",
                table: "MiddlewareSettings",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppBusinessAccountId",
                table: "MiddlewareSettings",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppGraphApiVersion",
                table: "MiddlewareSettings",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppPhoneNumberId",
                table: "MiddlewareSettings",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppPublicTunnelUrl",
                table: "MiddlewareSettings",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppVerifyToken",
                table: "MiddlewareSettings",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WhatsAppAccessToken",
                table: "MiddlewareSettings");

            migrationBuilder.DropColumn(
                name: "WhatsAppActiveTemplateName",
                table: "MiddlewareSettings");

            migrationBuilder.DropColumn(
                name: "WhatsAppAppSecret",
                table: "MiddlewareSettings");

            migrationBuilder.DropColumn(
                name: "WhatsAppBusinessAccountId",
                table: "MiddlewareSettings");

            migrationBuilder.DropColumn(
                name: "WhatsAppGraphApiVersion",
                table: "MiddlewareSettings");

            migrationBuilder.DropColumn(
                name: "WhatsAppPhoneNumberId",
                table: "MiddlewareSettings");

            migrationBuilder.DropColumn(
                name: "WhatsAppPublicTunnelUrl",
                table: "MiddlewareSettings");

            migrationBuilder.DropColumn(
                name: "WhatsAppVerifyToken",
                table: "MiddlewareSettings");
        }
    }
}
