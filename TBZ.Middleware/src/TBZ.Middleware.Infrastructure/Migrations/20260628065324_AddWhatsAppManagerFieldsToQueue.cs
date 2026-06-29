using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWhatsAppManagerFieldsToQueue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Channel",
                table: "DeliveryQueueItems",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeliveredAt",
                table: "DeliveryQueueItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FailureReason",
                table: "DeliveryQueueItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PatientId",
                table: "DeliveryQueueItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Provider",
                table: "DeliveryQueueItems",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ProviderMessageId",
                table: "DeliveryQueueItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReportId",
                table: "DeliveryQueueItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RetryCount",
                table: "DeliveryQueueItems",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "TemplateName",
                table: "DeliveryQueueItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TriggerEvent",
                table: "DeliveryQueueItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VisitId",
                table: "DeliveryQueueItems",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Channel",
                table: "DeliveryQueueItems");

            migrationBuilder.DropColumn(
                name: "DeliveredAt",
                table: "DeliveryQueueItems");

            migrationBuilder.DropColumn(
                name: "FailureReason",
                table: "DeliveryQueueItems");

            migrationBuilder.DropColumn(
                name: "PatientId",
                table: "DeliveryQueueItems");

            migrationBuilder.DropColumn(
                name: "Provider",
                table: "DeliveryQueueItems");

            migrationBuilder.DropColumn(
                name: "ProviderMessageId",
                table: "DeliveryQueueItems");

            migrationBuilder.DropColumn(
                name: "ReportId",
                table: "DeliveryQueueItems");

            migrationBuilder.DropColumn(
                name: "RetryCount",
                table: "DeliveryQueueItems");

            migrationBuilder.DropColumn(
                name: "TemplateName",
                table: "DeliveryQueueItems");

            migrationBuilder.DropColumn(
                name: "TriggerEvent",
                table: "DeliveryQueueItems");

            migrationBuilder.DropColumn(
                name: "VisitId",
                table: "DeliveryQueueItems");
        }
    }
}
