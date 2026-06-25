using System;

namespace TBZ.Middleware.Domain
{
    public class DailyOperationsFact
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public DateTime Date { get; set; }

        public int PatientsRegistered { get; set; }
        public int BillsCreated { get; set; }

        public decimal RevenueCollected { get; set; }
        public int PaymentsCount { get; set; } // Tracks number of PaymentReceived events

        public int SamplesCollected { get; set; }

        public int ReportsSigned { get; set; }
        public int ReportsDelivered { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
