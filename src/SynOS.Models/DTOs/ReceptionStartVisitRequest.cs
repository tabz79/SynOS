using System;

namespace SynOS.Models.DTOs
{
    public class ReceptionStartVisitRequest
    {
        public Guid PatientId { get; set; }
        public string Dept { get; set; } = string.Empty;
        public string[] TestCodes { get; set; } = [];
        public Guid? ReferrerId { get; set; }
        public Guid? AppointmentId { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal? DiscountPercent { get; set; }
        public decimal? TaxPercent { get; set; }
        public string? Notes { get; set; }
        public Guid? CombinedBillingGroupId { get; set; }

        // Referral Fields
        public bool? IsReferred { get; set; }
        public Guid? ReferralPartnerId { get; set; }
        public string? PaymentCollectionModel { get; set; }
    }
}
