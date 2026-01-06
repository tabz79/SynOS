using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscountMasterAndFact : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DiscountFacts",
                columns: table => new
                {
                    DiscountFactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DiscountDefinitionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GrossAmount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    NetAmountAfterDiscount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    AppliedBy = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    AppliedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiscountFacts", x => x.DiscountFactId);
                });

            migrationBuilder.CreateTable(
                name: "DiscountMasters",
                columns: table => new
                {
                    DiscountDefinitionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Scope = table.Column<int>(type: "int", nullable: false),
                    AttributionType = table.Column<int>(type: "int", nullable: false),
                    ValueMode = table.Column<int>(type: "int", nullable: false),
                    MaxLimit = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiscountMasters", x => x.DiscountDefinitionId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DiscountFacts");

            migrationBuilder.DropTable(
                name: "DiscountMasters");
        }
    }
}
