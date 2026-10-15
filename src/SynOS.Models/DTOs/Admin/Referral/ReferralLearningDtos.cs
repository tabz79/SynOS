using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums.Referral;

namespace SynOS.Models.DTOs.Admin.Referral
{
    public class PendingLearningTestDto
    {
        public Guid TestId { get; set; }
        public string TestCode { get; set; } = string.Empty;
        public string TestName { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int PrescribedCount { get; set; }
        public DateTimeOffset FirstPrescribedAt { get; set; }
        public DateTimeOffset LastPrescribedAt { get; set; }
        public decimal SuggestedPercentage { get; set; }
    }

    public class PendingLearningDoctorGroupDto
    {
        public Guid ReferralPartnerId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string? ClinicName { get; set; }
        public string? Location { get; set; }
        public string? ContactInfo { get; set; }
        public decimal DefaultCommissionPercentage { get; set; }
        public int TotalPendingVisits { get; set; }
        public List<PendingLearningTestDto> UnmappedTests { get; set; } = new();
    }

    public class CommitLearningRuleItemDto
    {
        [Required]
        public Guid ReferralPartnerId { get; set; }

        [Required]
        public Guid TestId { get; set; }

        public CommissionType CommissionType { get; set; } = CommissionType.Percentage;

        [Required]
        [Range(0, (double)decimal.MaxValue)]
        public decimal CommissionValue { get; set; }
    }

    public class CommitLearningBatchRequestDto
    {
        [Required]
        public List<CommitLearningRuleItemDto> Rules { get; set; } = new();
    }

    public class CommitLearningBatchResponseDto
    {
        public int LearnedRulesCount { get; set; }
        public int RecalculatedVisitsCount { get; set; }
        public decimal TotalCommissionRecognized { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class DoctorLearnedRuleReadDto
    {
        public Guid RuleId { get; set; }
        public Guid ReferralPartnerId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public Guid TestId { get; set; }
        public string TestCode { get; set; } = string.Empty;
        public string TestName { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public decimal TestPrice { get; set; }
        public CommissionType CommissionType { get; set; }
        public decimal CommissionValue { get; set; }
        public DateOnly EffectiveFrom { get; set; }
        public bool IsActive { get; set; }
    }
}
