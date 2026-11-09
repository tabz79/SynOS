using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.HealthCards
{
    public class PatientHealthCard
    {
        [Key]
        public Guid CardId { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(50)]
        public string CardNumber { get; set; } = string.Empty;

        [Required]
        public Guid PlanId { get; set; }

        [ForeignKey("PlanId")]
        public HealthCardPlanMaster? Plan { get; set; }

        [Required]
        public Guid PrimaryPatientId { get; set; }

        [ForeignKey("PrimaryPatientId")]
        public Patient? PrimaryPatient { get; set; }

        [Required]
        [StringLength(20)]
        public string PrimaryPhoneNumber { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18, 2)")]
        public decimal PricePaid { get; set; }

        [StringLength(50)]
        public string PaymentMode { get; set; } = "Cash";

        [StringLength(20)]
        public string ConfiguredDiscountType { get; set; } = "Percentage"; // "Percentage" | "Flat"

        [Column(TypeName = "decimal(18, 2)")]
        public decimal ConfiguredDiscountValue { get; set; } = 30.00m;

        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;

        public DateTime ValidUntil { get; set; } = DateTime.UtcNow.AddYears(1);

        [StringLength(20)]
        public string Status { get; set; } = "Active"; // "Active" | "PendingPayment" | "Expired" | "Suspended" | "Cancelled"

        public Guid? AssociatedVisitId { get; set; }

        public Guid? RevenueFactId { get; set; }

        public Guid? IssuedAtBranchId { get; set; }

        public Guid? IssuedByUserId { get; set; }

        [StringLength(100)]
        public string? IssuedByUserName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<HealthCardBeneficiary> Beneficiaries { get; set; } = new List<HealthCardBeneficiary>();
        public ICollection<HealthCardUsageLedger> Usages { get; set; } = new List<HealthCardUsageLedger>();
    }
}
