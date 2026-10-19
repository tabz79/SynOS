using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums;

namespace SynOS.Models.DTOs.Admin
{
    public class DiscountDto
    {
        public Guid DiscountDefinitionId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DiscountType Type { get; set; }
        public decimal Value { get; set; }
        public decimal? MaxLimit { get; set; }
        public bool IsActive { get; set; }
        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateDiscountDto
    {
        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public DiscountType Type { get; set; }

        [Required]
        public decimal Value { get; set; }

        public decimal? MaxLimit { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
    }

    public class UpdateDiscountDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public decimal Value { get; set; }

        public decimal? MaxLimit { get; set; }

        public bool IsActive { get; set; }

        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
    }

    public class DiscountHistoryItemDto
    {
        public Guid Id { get; set; }
        public DateTime OccurredAt { get; set; }
        public string Source { get; set; } = "Patient"; // "Patient" or "Partner B2B"
        public string VisitToken { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string? PatientMrn { get; set; }
        public string? PartnerName { get; set; }
        public string DiscountName { get; set; } = string.Empty;
        public string DiscountType { get; set; } = "Flat"; // "Percentage" or "Flat"
        public decimal DiscountValue { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; }
        public string AppliedBy { get; set; } = string.Empty;
        public string? Reason { get; set; }
    }
}