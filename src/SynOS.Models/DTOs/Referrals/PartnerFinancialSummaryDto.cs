namespace SynOS.Models.DTOs.Referrals
{
    public class PartnerFinancialSummaryDto
    {
        /// <summary>
        /// The gross total amount owed to the lab by the partner.
        /// Calculated as SUM(all ReceivableFact.Amount).
        /// </summary>
        public decimal TotalReceivables { get; set; }

        /// <summary>
        /// The gross total amount owed by the lab to the partner (commissions).
        /// Calculated as SUM(all PayableFact.AmountOwed).
        /// </summary>
        public decimal TotalPayables { get; set; }

        /// <summary>
        /// The on-demand calculated net position from the lab's perspective.
        /// Positive: Partner owes the lab.
        /// Negative: Lab owes the partner.
        /// </summary>
        public decimal NetPosition { get; set; }
    }
}
