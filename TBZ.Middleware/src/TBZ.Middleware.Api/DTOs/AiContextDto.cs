using System;
using System.Collections.Generic;

namespace TBZ.Middleware.Api.DTOs
{
    public class AiContextDto
    {
        public KnowledgeMetadataDto Knowledge { get; set; } = null!;
        public LabContextDto Lab { get; set; } = null!;
        public List<DoctorContextItemDto> TopDoctors { get; set; } = new();
        public List<ReferralPartnerContextItemDto> TopReferralPartners { get; set; } = new();
        public List<TestContextItemDto> TopTests { get; set; } = new();
        public List<BusinessSourceContextItemDto> BusinessSources { get; set; } = new();
        public DemographicsContextDto Demographics { get; set; } = null!;
        public TrendsSummaryDto Trends { get; set; } = null!;
    }

    public class ContextCapabilitiesDto
    {
        public bool Doctors { get; set; } = true;
        public bool ReferralPartners { get; set; } = true;
        public bool Tests { get; set; } = true;
        public bool Revenue { get; set; } = true;
        public bool Demographics { get; set; } = true;
        public bool BusinessSources { get; set; } = true;

        public bool WhatsApp { get; set; } = false;
        public bool Marketing { get; set; } = false;
        public bool Inventory { get; set; } = false;
        public bool WebsiteAnalytics { get; set; } = false;
    }

    public class KnowledgeMetadataDto
    {
        public string SchemaVersion { get; set; } = "1.1";
        public DateTime GeneratedAt { get; set; }
        public string Source { get; set; } = "ProjectionFacts";
        public long ProjectionSequence { get; set; }

        public string Coverage { get; set; } = string.Empty;
        public DateTime? AvailableSince { get; set; }
        public int TotalDays { get; set; }
        public int TotalPatients { get; set; }

        public string ProjectionStatus { get; set; } = string.Empty;
        public DateTime? LastProjectionAt { get; set; }
        public ContextCapabilitiesDto Capabilities { get; set; } = new();
    }

    public class EntityContextResponseDto
    {
        public KnowledgeMetadataDto Knowledge { get; set; } = null!;
        public string EntityType { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public object Data { get; set; } = null!;
    }

    public class LabContextDto
    {
        public List<DailyRevenueDto> RevenueHistory { get; set; } = new();
        public OverviewDto DailyOperations { get; set; } = null!;
        public WorkflowTatDto WorkflowMetrics { get; set; } = null!;
        public DeliverySummaryDto DeliveryMetrics { get; set; } = null!;
        public TrendsSummaryDto OperationalTrends { get; set; } = null!;
    }

    public class DoctorContextItemDto
    {
        public string DoctorId { get; set; } = string.Empty;
        public string DoctorName { get; set; } = string.Empty;
        public int TotalPatients { get; set; }
        public decimal TotalRevenueGenerated { get; set; }
        public int TotalTests { get; set; }
        public DateTime? FirstReferralDate { get; set; }
        public DateTime? LatestReferralDate { get; set; }
        public List<TrendPointDto> MonthlyTrend { get; set; } = new();
        public List<TrendPointDto> WeeklyTrend { get; set; } = new();
        public List<TrendPointDto> DailyTrend { get; set; } = new();
    }

    public class ReferralPartnerContextItemDto
    {
        public string PartnerId { get; set; } = string.Empty;
        public string PartnerName { get; set; } = string.Empty;
        public string PartnerLocation { get; set; } = string.Empty;
        public int TotalPatients { get; set; }
        public decimal TotalRevenueGenerated { get; set; }
        public int TotalTests { get; set; }
        public DateTime? FirstReferralDate { get; set; }
        public DateTime? LatestReferralDate { get; set; }
        public List<TrendPointDto> MonthlyTrend { get; set; } = new();
        public List<TrendPointDto> WeeklyTrend { get; set; } = new();
        public List<TrendPointDto> DailyTrend { get; set; } = new();
    }

    public class TestContextItemDto
    {
        public string TestCode { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public int VolumeCount { get; set; }
        public List<TrendPointDto> DailyCounts { get; set; } = new();
        public List<TrendPointDto> WeeklyCounts { get; set; } = new();
        public List<TrendPointDto> MonthlyCounts { get; set; } = new();
    }

    public class BusinessSourceContextItemDto
    {
        public string SourceType { get; set; } = string.Empty;
        public string SourceId { get; set; } = string.Empty;
        public string SourceName { get; set; } = string.Empty;
        public bool IsFirstVisit { get; set; }
        public int TotalPatients { get; set; }
        public decimal TotalRevenueGenerated { get; set; }
        public int TotalTests { get; set; }
        public DateTime? FirstReferralDate { get; set; }
        public DateTime? LatestReferralDate { get; set; }
        public List<TrendPointDto> MonthlyTrend { get; set; } = new();
        public List<TrendPointDto> WeeklyTrend { get; set; } = new();
        public List<TrendPointDto> DailyTrend { get; set; } = new();
    }

    public class DemographicsContextDto
    {
        public List<DemographicMetricDto> AgeGroups { get; set; } = new();
        public List<DemographicMetricDto> Genders { get; set; } = new();
        public List<DemographicLocationMetricDto> Locations { get; set; } = new();
        public List<TrendPointDto> GrowthHistory { get; set; } = new();
    }

    public class DemographicLocationMetricDto
    {
        public string Location { get; set; } = string.Empty;
        public int PatientCount { get; set; }
        public decimal Revenue { get; set; }
        public int TestCount { get; set; }
    }


    public class TrendPointDto
    {
        public string Period { get; set; } = string.Empty; // e.g. "2026-06", "2026-W26", "2026-06-26"
        public int PatientCount { get; set; }
        public decimal Revenue { get; set; }
        public int TestCount { get; set; }
    }
}
