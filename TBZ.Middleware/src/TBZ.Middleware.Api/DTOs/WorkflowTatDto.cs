using System;

namespace TBZ.Middleware.Api.DTOs
{
    public class WorkflowTatDto
    {
        public string LabId { get; set; } = string.Empty;
        public string? BranchId { get; set; }
        
        public double AvgRegistrationToCheckoutMinutes { get; set; }
        public double AvgCheckoutToSampleDrawMinutes { get; set; }
        public double AvgSampleDrawToProcessingMinutes { get; set; }
        public double AvgProcessingToReportSignedMinutes { get; set; }
        public double AvgReportSignedToReportDeliveredMinutes { get; set; }
        public double AvgOverallTurnaroundTimeMinutes { get; set; }

        public int TotalCompletedVisitsCount { get; set; }
    }
}
