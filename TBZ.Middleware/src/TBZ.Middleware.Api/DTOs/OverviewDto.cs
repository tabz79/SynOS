using System;

namespace TBZ.Middleware.Api.DTOs
{
    public class OverviewDto
    {
        public string LabId { get; set; } = string.Empty;
        public string? BranchId { get; set; }
        public DateTime Date { get; set; }
        
        // Throughput (Today's counts)
        public int RegistrationsToday { get; set; }
        public int BillsCreatedToday { get; set; }
        public int SamplesCollectedToday { get; set; }
        public int ReportsSignedToday { get; set; }
        public int ReportsDeliveredToday { get; set; }
        public decimal RevenueCollectedToday { get; set; }
        public int PaymentsCountToday { get; set; }

        // Active Queues (Backlogs)
        public int BacklogAwaitingPayment { get; set; }
        public int BacklogAwaitingSampleDraw { get; set; }
        public int BacklogAwaitingProcessing { get; set; }
        public int BacklogAwaitingVerification { get; set; }
        public int BacklogPendingDispatch { get; set; }
    }
}
