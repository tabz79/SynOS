using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Entities.Referral;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities
{
    public class Visit
    {
        [Key]
        public Guid VisitId { get; set; }

        [Required]
        public Guid PatientId { get; set; }

        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid? CreatedByUserId { get; set; }
        [ForeignKey("CreatedByUserId")]
        public virtual User? Creator { get; set; }

        public Guid? AssignedReceptionistId { get; set; }
        [ForeignKey("AssignedReceptionistId")]
        public virtual User? AssignedReceptionist { get; set; }

        public Guid? ReferrerId { get; set; }
        [ForeignKey("ReferrerId")]
        public virtual Referrer? Referrer { get; set; }

        public Guid? BranchId { get; set; } // Nullable FK
        [ForeignKey("BranchId")]
        public virtual Branch? Branch { get; set; } // Nullable navigation property

        [Required]
        [StringLength(64)] // Accommodates all token formats including drafts and modality tokens
        public string Token { get; set; } = string.Empty;

        [Required]
        public DateTime TokenDate { get; set; } // Lab local date

        [Required]
        [StringLength(50)]
        public string Department { get; set; } = string.Empty;

        [Required]
        public VisitStatus Status { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        [Timestamp]
        public byte[]? RowVersion { get; set; }

        public ICollection<Order> Orders { get; set; } = new List<Order>();
        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

        public Guid? CurrentAssignmentId { get; set; } // Link to active WorkAssignment

        // Referral Fields
        public bool IsReferred { get; set; } = false;
        public Guid? ReferralPartnerId { get; set; }
        [ForeignKey("ReferralPartnerId")]
        public virtual ReferralPartner? ReferralPartner { get; set; }

        public Guid? SecondaryReferralPartnerId { get; set; }
        [ForeignKey("SecondaryReferralPartnerId")]
        public virtual ReferralPartner? SecondaryReferralPartner { get; set; }

        public string? PaymentCollectionModel { get; set; }
        
        [StringLength(500)]
        public string? ReferrerText { get; set; } // Free-text metadata (Primary Prescribing Doctor)

        [Column(TypeName = "decimal(18,2)")]
        public decimal? B2BDiscountAmount { get; set; }

        [StringLength(20)]
        public string? B2BDiscountType { get; set; } // "Percentage" or "Flat"

        [Column(TypeName = "decimal(18,2)")]
        public decimal? B2BDiscountValue { get; set; } // The actual number entered: e.g. 50 (for 50%) or 200 (for ₹200)

        [StringLength(256)]
        public string? B2BDiscountEnteredBy { get; set; }

        public DateTimeOffset? B2BDiscountEnteredAt { get; set; }

        public virtual ReferralDraft? ReferralDraft { get; set; }
        
        public virtual ICollection<Specimen> Specimens { get; set; } = new List<Specimen>();

        // Multi-Payer Billing Engine (Prepaid, Insurance, Corporate)
        public BillingType BillingType { get; set; } = BillingType.Standard;

        // Insurance / TPA Context
        public Guid? InsuranceCompanyId { get; set; }
        [ForeignKey("InsuranceCompanyId")]
        public virtual InsuranceCompany? InsuranceCompany { get; set; }

        [StringLength(100)]
        public string? PolicyNumber { get; set; }

        [StringLength(100)]
        public string? PreAuthApprovalNumber { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal InsuranceCoPayAmount { get; set; } = 0;

        // Corporate B2B Context
        public Guid? CorporateAccountId { get; set; }
        [ForeignKey("CorporateAccountId")]
        public virtual CorporateAccount? CorporateAccount { get; set; }

        [StringLength(100)]
        public string? EmployeeId { get; set; }

        public Guid? CorporatePackageId { get; set; }
    }
}