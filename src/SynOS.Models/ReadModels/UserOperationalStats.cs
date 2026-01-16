using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.ReadModels
{
    public class UserOperationalStats
    {
        public Guid UserId { get; set; }
        public Guid BranchId { get; set; }
        
        /// <summary>
        /// UTC Date (Time component normalized to 00:00:00Z)
        /// </summary>
        public DateTime Date { get; set; }

        public int WalkInsCount { get; set; }
        
        [Column(TypeName = "decimal(18, 2)")]
        public decimal PaymentsTotal { get; set; }
        
        public double ReportTatTotalMinutes { get; set; }
        public int ReportTatCount { get; set; }
        
        public DateTime LastUpdated { get; set; }
    }
}