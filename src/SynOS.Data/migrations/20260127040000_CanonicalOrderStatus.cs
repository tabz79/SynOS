using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    public partial class CanonicalOrderStatus : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Convert existing string values to int
            // 'Pending' -> 0
            // 'Active' -> 1
            // 'Cancelled' -> 2
            // 'Collected' -> 3
            // 'Completed' -> 4
            // Default/Unknown -> 0 (Pending)

            migrationBuilder.Sql("UPDATE Orders SET Status = '0' WHERE Status = 'Pending'");
            migrationBuilder.Sql("UPDATE Orders SET Status = '1' WHERE Status = 'Active'");
            migrationBuilder.Sql("UPDATE Orders SET Status = '2' WHERE Status = 'Cancelled'");
            migrationBuilder.Sql("UPDATE Orders SET Status = '3' WHERE Status = 'Collected'");
            migrationBuilder.Sql("UPDATE Orders SET Status = '4' WHERE Status = 'Completed'");
            // Handle legacy/other
            migrationBuilder.Sql("UPDATE Orders SET Status = '0' WHERE Status NOT IN ('0','1','2','3','4')");

            // 2. Alter column
            migrationBuilder.AlterColumn<int>(
                name: "Status",
                table: "Orders",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Orders",
                type: "nvarchar(50)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");
                
            // Revert ints to strings (Approximate)
            migrationBuilder.Sql("UPDATE Orders SET Status = 'Pending' WHERE Status = '0'");
            migrationBuilder.Sql("UPDATE Orders SET Status = 'Active' WHERE Status = '1'");
            migrationBuilder.Sql("UPDATE Orders SET Status = 'Cancelled' WHERE Status = '2'");
            migrationBuilder.Sql("UPDATE Orders SET Status = 'Collected' WHERE Status = '3'");
            migrationBuilder.Sql("UPDATE Orders SET Status = 'Completed' WHERE Status = '4'");
        }
    }
}
