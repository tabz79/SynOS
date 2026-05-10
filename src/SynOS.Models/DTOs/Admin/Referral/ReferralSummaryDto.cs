using System;

namespace SynOS.Models.DTOs.Admin.Referral
{
    public class ReferralSummaryDto
    {
        public decimal TotalPendingPayouts { get; set; }
        public int TotalActivePartners { get; set; }
        public decimal TotalPendingReceivables { get; set; }
        public int NewReferralsToday { get; set; }
        public decimal TotalReferralRevenueToday { get; set; }
    }
}
