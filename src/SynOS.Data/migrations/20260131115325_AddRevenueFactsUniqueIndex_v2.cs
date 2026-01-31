using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRevenueFactsUniqueIndex_v2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // --- CRITICAL DATA CORRECTION (v2) ---
            // Issue: Existing RevenueFacts use VisitId as SourceReferenceId.
            // Fix: We must update them to use PaymentId (from Payments table) to support Split Payments.
            // Linkage: RevenueFact.ExternalTransactionId == Payment.ReceiptNo
            
            migrationBuilder.Sql(@"
                UPDATE rf
                SET SourceReferenceId = CAST(p.PaymentId AS NVARCHAR(40))
                FROM RevenueFacts rf
                INNER JOIN Payments p ON rf.ExternalTransactionId = p.ReceiptNo
                WHERE rf.SourceType = 'Patient' OR rf.SourceType = 0
            ");
            
            // --------------------------------

            migrationBuilder.CreateIndex(
                name: "IX_RevenueFacts_SourceType_SourceReferenceId",
                table: "RevenueFacts",
                columns: new[] { "SourceType", "SourceReferenceId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RevenueFacts_SourceType_SourceReferenceId",
                table: "RevenueFacts");
        }
    }
}
