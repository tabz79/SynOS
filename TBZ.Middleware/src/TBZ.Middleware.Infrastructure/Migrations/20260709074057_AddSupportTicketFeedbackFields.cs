using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSupportTicketFeedbackFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StatusMessage",
                table: "SupportTickets",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "SupportTickets",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StatusMessage",
                table: "SupportTickets");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "SupportTickets");
        }
    }
}
