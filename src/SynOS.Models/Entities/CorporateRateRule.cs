using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    [Table("CorporateRateRules")]
    public class CorporateRateRule
    {
        [Key]
        public Guid CorporateRateRuleId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid CorporateAccountId { get; set; }

        [ForeignKey("CorporateAccountId")]
        public virtual CorporateAccount CorporateAccount { get; set; } = null!;

        [Required]
        public Guid TestId { get; set; }

        [ForeignKey("TestId")]
        public virtual Test Test { get; set; } = null!;

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal ContractedPrice { get; set; }

        public bool IsPackage { get; set; } = false;

        [StringLength(50)]
        public string? PackageCode { get; set; }

        [StringLength(200)]
        public string? PackageName { get; set; }

        public DateTimeOffset EffectiveFrom { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? EffectiveTo { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
