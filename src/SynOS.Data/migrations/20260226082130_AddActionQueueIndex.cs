using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddActionQueueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Visits_BranchId",
                table: "Visits");

            migrationBuilder.Sql(@"
                UPDATE Visits SET Status = '0' WHERE Status = 'Draft';
                UPDATE Visits SET Status = '1' WHERE Status = 'PendingPayment';
                UPDATE Visits SET Status = '2' WHERE Status = 'Paid';
                UPDATE Visits SET Status = '3' WHERE Status = 'FullPaid';
                UPDATE Visits SET Status = '4' WHERE Status = 'PartialPayment';
                UPDATE Visits SET Status = '5' WHERE Status = 'Cancelled';
                UPDATE Visits SET Status = '6' WHERE Status = 'InPhlebotomy';
                UPDATE Visits SET Status = '7' WHERE Status = 'InLab';
                UPDATE Visits SET Status = '8' WHERE Status = 'Completed';
                UPDATE Visits SET Status = '9' WHERE Status = 'Finalized';
                
                -- Fallback for any unknown status
                UPDATE Visits SET Status = '0' WHERE Status NOT IN ('0','1','2','3','4','5','6','7','8','9');
            ");

            migrationBuilder.AlterColumn<int>(
                name: "Status",
                table: "Visits",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.CreateIndex(
                name: "IX_Visits_BranchId_AssignedReceptionistId_TokenDate",
                table: "Visits",
                columns: new[] { "BranchId", "AssignedReceptionistId", "TokenDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Visits_BranchId_AssignedReceptionistId_TokenDate",
                table: "Visits");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Visits",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.CreateIndex(
                name: "IX_Visits_BranchId",
                table: "Visits",
                column: "BranchId");
        }
    }
}
