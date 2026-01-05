namespace SynOS.Models.DTOs.Referrals
{
    /// <summary>
    /// Represents a system-wide, on-demand snapshot of financial exposure 
    /// related to the referral program. All values represent exposure, not settled cash.
    /// </summary>
    public class SystemReferralExposureDto
    {
        /// <summary>
        /// The gross total amount owed to the lab by all partners.
        /// Aggregated from SUM(all PartnerFinancialSummary.TotalReceivables).
        /// </summary>
        public decimal SystemTotalReceivables { get; set; }

        /// <summary>
        /// The gross total commission amount owed by the lab to all partners.
        /// Aggregated from SUM(all PartnerFinancialSummary.TotalPayables).
        /// </summary>
        public decimal SystemTotalPayables { get; set; }

        /// <summary>
        /// The on-demand calculated net financial position of the entire referral program.
        /// Positive: Net receivable across all partners.
        /// Negative: Net payable across all partners.
        /// </summary>
        public decimal SystemNetPosition { get; set; }
    }
}
