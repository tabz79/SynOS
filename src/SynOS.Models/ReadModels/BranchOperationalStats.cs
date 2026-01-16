using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.ReadModels
{
    public class BranchOperationalStats
    {
        public Guid BranchId { get; set; }
        
        /// <summary>
        /// UTC Date (Time component normalized to 00:00:00Z)
        /// </summary>
        public DateTime Date { get; set; }

        public int PendingReportsCount { get; set; }
        
        public DateTime LastUpdated { get; set; }
    }
}