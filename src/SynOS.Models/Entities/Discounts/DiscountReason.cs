using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Discounts
{
    public class DiscountReason
    {
        [Key]
        public Guid DiscountReasonId { get; set; }

        [Required]
        [StringLength(200)]
        public string ReasonText { get; set; } = string.Empty;

        [StringLength(100)]
        public string? Category { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;

        public int SortOrder { get; set; } = 0;

        [StringLength(100)]
        public string? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}
