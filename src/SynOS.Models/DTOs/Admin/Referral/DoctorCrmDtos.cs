using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums.Referral;

namespace SynOS.Models.DTOs.Admin.Referral
{
    public class DoctorDemographicsDto
    {
        public string? Speciality { get; set; }
        public string? Qualifications { get; set; }
        public string? RegistrationNumber { get; set; } // MCI / State Medical Council Number
        public string? Phone { get; set; }
        public string? Whatsapp { get; set; }
        public string? Email { get; set; }
        public string? ClinicAddress { get; set; }
        public string? UpiId { get; set; }
        public string? BankName { get; set; }
        public string? AccountNumber { get; set; }
        public string? IfscCode { get; set; }
        public string? Notes { get; set; }
    }

    public class DoctorCrmCardDto
    {
        public Guid ReferralPartnerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public PartnerType PartnerType { get; set; }
        public string? ClinicName { get; set; }
        public string? Location { get; set; }
        public DoctorDemographicsDto Demographics { get; set; } = new();
        public PartnerStatus Status { get; set; }
        public string? PaymentCollectionModel { get; set; }
        public decimal DefaultCommissionPercentage { get; set; }
        public CommissionCalculationBase CalculationBase { get; set; }

        // Live Organic Commercial Metrics
        public int TotalPatientsReferred { get; set; }
        public int ThisMonthPatientsReferred { get; set; }
        public int TotalTestsPrescribed { get; set; }
        public decimal TotalRevenueGenerated { get; set; }
        public decimal TotalCommissionEarned { get; set; }
        public decimal TotalCommissionPaid { get; set; }
        public decimal PendingPayoutDue { get; set; }

        // Rate Card & Learning Stats
        public int LearnedRulesCount { get; set; }
        public int UnmappedTestsCount { get; set; }
        public bool HasUnmappedWaiting => UnmappedTestsCount > 0;

        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? LastReferredAt { get; set; }
    }

    public class DoctorDirectoryFilterDto
    {
        public string? Query { get; set; }
        public string? Status { get; set; } // "all", "active", "draft", "has_unmapped"
        public string? Speciality { get; set; }
        public string? PartnerType { get; set; } // "all", "Doctor", "Clinic", "Hospital", "RMP"
        public string? SortBy { get; set; } // "name", "revenue", "patients", "unmapped", "recent"
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 24;
    }

    public class DoctorDirectoryPagedResultDto
    {
        public List<DoctorCrmCardDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;

        // Directory Global KPI Summary
        public int TotalDoctorsCount { get; set; }
        public int ActiveReferrersThisMonthCount { get; set; }
        public int DoctorsWithUnmappedTestsCount { get; set; }
        public decimal TotalLifetimeReferralRevenue { get; set; }
    }

    public class DoctorRecentVisitDto
    {
        public Guid VisitId { get; set; }
        public string Token { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Gender { get; set; } = string.Empty;
        public DateTimeOffset VisitDate { get; set; }
        public decimal TotalBill { get; set; }
        public decimal CommissionAmount { get; set; }
        public string CommissionStatus { get; set; } = "Recognized";
        public List<string> TestsSummary { get; set; } = new();
    }

    public class DoctorTopTestDto
    {
        public Guid TestId { get; set; }
        public string TestCode { get; set; } = string.Empty;
        public string TestName { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public int PrescribedCount { get; set; }
        public decimal TotalRevenue { get; set; }
        public bool HasLearnedRule { get; set; }
        public CommissionType? CommissionType { get; set; }
        public decimal CommissionValue { get; set; }
    }

    public class DoctorProfileDetailDto
    {
        public DoctorCrmCardDto Profile { get; set; } = new();
        public List<DoctorLearnedRuleReadDto> RateCard { get; set; } = new();
        public List<PendingLearningTestDto> UnmappedTests { get; set; } = new();
        public List<DoctorRecentVisitDto> RecentVisits { get; set; } = new();
        public List<DoctorTopTestDto> TopPrescribedTests { get; set; } = new();
    }

    public class UpdateDoctorDemographicsRequestDto
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;
        public PartnerType PartnerType { get; set; } = PartnerType.Doctor;
        public string? ClinicName { get; set; }
        public string? Location { get; set; }
        public string? PaymentCollectionModel { get; set; }
        public PartnerStatus Status { get; set; } = PartnerStatus.Active;
        public decimal DefaultCommissionPercentage { get; set; }
        public CommissionCalculationBase CalculationBase { get; set; } = CommissionCalculationBase.AfterDiscounts;
        public DoctorDemographicsDto Demographics { get; set; } = new();
    }
}
