using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationLabId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LabId",
                table: "NotificationOutboxes",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                defaultValue: "LAB001");

            migrationBuilder.AddColumn<string>(
                name: "LabId",
                table: "NotificationMessages",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                defaultValue: "LAB001");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LabId",
                table: "NotificationOutboxes");

            migrationBuilder.DropColumn(
                name: "LabId",
                table: "NotificationMessages");
        }
    }
}
