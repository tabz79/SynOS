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

    public class DiscountReasonDto
    {
        public Guid DiscountReasonId { get; set; }
        public string ReasonText { get; set; } = string.Empty;
        public string? Category { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public int SortOrder { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int UsageCount { get; set; } = 0;
        public decimal TotalDiscountAmount { get; set; } = 0m;
        public decimal AvgDiscountAmount { get; set; } = 0m;
    }

    public class ConcessionIntelligenceDto
    {
        public decimal TotalDiscountAmount { get; set; }
        public int TotalBillsDiscounted { get; set; }
        public decimal TotalGrossBilled { get; set; }
        public decimal OverallDiscountPercentage { get; set; }

        public decimal PatientDiscountAmount { get; set; }
        public int PatientBillsCount { get; set; }
        public decimal PatientAvgDiscount { get; set; }
        public decimal PatientSharePercentage { get; set; }

        public decimal PartnerDiscountAmount { get; set; }
        public int PartnerBillsCount { get; set; }
        public decimal PartnerAvgDiscount { get; set; }
        public decimal PartnerSharePercentage { get; set; }

        public System.Collections.Generic.List<PresetReasonContributionDto> TopPresetReasons { get; set; } = new();
        public System.Collections.Generic.List<PartnerConcessionContributionDto> TopB2BPartners { get; set; } = new();

        public int TotalPresetsCount { get; set; }
        public int ActivePresetsCount { get; set; }
        public int UsedPresetsCount { get; set; }
        public int DormantPresetsCount { get; set; }

        public System.Collections.Generic.List<StaffConcessionContributionDto> StaffContributions { get; set; } = new();
    }

    public class PresetReasonContributionDto
    {
        public Guid? DiscountReasonId { get; set; }
        public string ReasonText { get; set; } = string.Empty;
        public string Category { get; set; } = "General";
        public int UsageCount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PercentageOfPatientDiscounts { get; set; }
        public decimal AvgAmount { get; set; }
    }

    public class PartnerConcessionContributionDto
    {
        public Guid? PartnerId { get; set; }
        public string PartnerName { get; set; } = string.Empty;
        public int BillsCount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PercentageOfPartnerDiscounts { get; set; }
        public decimal AvgAmount { get; set; }
    }

    public class StaffConcessionContributionDto
    {
        public string StaffName { get; set; } = string.Empty;
        public int BillsCount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal AvgAmount { get; set; }
    }

    public class CreateDiscountReasonDto
    {
        [Required]
        [StringLength(200)]
        public string ReasonText { get; set; } = string.Empty;

        [StringLength(100)]
        public string? Category { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;

        public int SortOrder { get; set; } = 0;
    }

    public class UpdateDiscountReasonDto
    {
        [Required]
        [StringLength(200)]
        public string ReasonText { get; set; } = string.Empty;

        [StringLength(100)]
        public string? Category { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        public bool IsActive { get; set; }

        public int SortOrder { get; set; }
    }
}