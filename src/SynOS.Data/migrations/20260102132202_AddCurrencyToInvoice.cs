using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCurrencyToInvoice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Invoices",
                type: "nvarchar(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "INR");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Invoices");
        }
    }
}
