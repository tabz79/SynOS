using System;

namespace TBZ.Middleware.Api.DTOs
{
    public class DashboardDto
    {
        public DashboardMetadataDto Metadata { get; set; } = null!;
        public OperationalSectionDto Operational { get; set; } = null!;
        public BusinessSectionDto Business { get; set; } = null!;
        public IntelligenceSectionDto Intelligence { get; set; } = null!;
    }

    public class DashboardMetadataDto
    {
        public DateTime GeneratedAt { get; set; }
        public string LabId { get; set; } = string.Empty;
        public string? BranchId { get; set; }
        public string TimeRange { get; set; } = string.Empty;
        public string ProjectionStatus { get; set; } = string.Empty; // "Up-to-date" or "Syncing"
        public DateTime? LastEventReceived { get; set; }
    }

    public class OperationalSectionDto
    {
        public OverviewDto Overview { get; set; } = null!;
        public WorkflowTatDto Workflow { get; set; } = null!;
        public DeliverySummaryDto Delivery { get; set; } = null!;
        public HealthDto Health { get; set; } = null!;
    }

    public class BusinessSectionDto
    {
        public RevenueSummaryDto Revenue { get; set; } = null!;
        public BusinessSourcesSummaryDto BusinessSources { get; set; } = null!;
        public ReferralsSummaryDto Referrals { get; set; } = null!;
    }

    public class IntelligenceSectionDto
    {
        public TrendsSummaryDto Trends { get; set; } = null!;
        public DemographicsSummaryDto Demographics { get; set; } = null!;
        public TestVolumeSummaryDto Tests { get; set; } = null!;
    }
}
