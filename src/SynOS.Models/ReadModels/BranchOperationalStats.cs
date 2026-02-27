using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.ReadModels
{
    public class BranchOperationalStats
    {
        public Guid BranchId { get; set; }
        
        /// <summary>
        /// UTC Date (Time component normalized to 00:00:00Z)
        /// </summary>
        public DateTime Date { get; set; }

        public int WalkInsCount { get; set; }
        
        [Column(TypeName = "decimal(18, 2)")]
        public decimal PaymentsTotal { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal PaymentsCashTotal { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal PaymentsOnlineTotal { get; set; }

        public int PaymentsOnlineCount { get; set; }

        public int PrepaidBillsCount { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal PrepaidBillsTotal { get; set; }
        
        public double ReportTatTotalMinutes { get; set; }
        public int ReportTatCount { get; set; }
        
        public int PendingReportsCount { get; set; }
        public int PendingCollectionsCount { get; set; }
        public int CompletedCollectionsCount { get; set; }
        public int TestsRunningCount { get; set; }
        
        public DateTime LastUpdated { get; set; }
    }
}