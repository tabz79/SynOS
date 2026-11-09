using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.HealthCards
{
    public class HealthCardPlanMaster
    {
        [Key]
        public Guid PlanId { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(50)]
        public string PlanCode { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string PlanName { get; set; } = string.Empty;

        [StringLength(250)]
        public string? Description { get; set; }

        public int MaxMembers { get; set; } = 1;

        [Column(TypeName = "decimal(18, 2)")]
        public decimal Price { get; set; }

        [Column(TypeName = "decimal(5, 2)")]
        public decimal DefaultDiscountPercentage { get; set; } = 30.00m;

        public int DefaultValidityDays { get; set; } = 365;

        public bool AllowOutsourceDiscounts { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
