using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    [Table("CorporateAccounts")]
    public class CorporateAccount
    {
        [Key]
        public Guid CorporateAccountId { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(200)]
        public string CompanyName { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string CorporateCode { get; set; } = string.Empty;

        [StringLength(50)]
        public string? GstNumber { get; set; }

        [StringLength(100)]
        public string? ContactPerson { get; set; }

        [StringLength(100)]
        public string? ContactEmail { get; set; }

        [StringLength(50)]
        public string? ContactPhone { get; set; }

        [StringLength(500)]
        public string? BillingAddress { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? CreditLimit { get; set; }

        public int PaymentTermsDays { get; set; } = 30;

        public DateTimeOffset? ContractStartDate { get; set; }
        public DateTimeOffset? ContractEndDate { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        public virtual ICollection<CorporateRateRule> RateRules { get; set; } = new List<CorporateRateRule>();
    }
}
