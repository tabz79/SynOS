using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPayStructureComponentTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PayStructureComponents",
                columns: table => new
                {
                    PayStructureComponentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PayStructureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PayComponentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayStructureComponents", x => x.PayStructureComponentId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PayStructureComponents");
        }
    }
}
