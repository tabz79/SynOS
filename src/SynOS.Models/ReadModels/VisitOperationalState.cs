using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.ReadModels
{
    public class VisitOperationalState
    {
        [Key]
        public Guid VisitId { get; set; }
        public Guid AssignedReceptionistId { get; set; }
        public Guid BranchId { get; set; }
        public DateTime Date { get; set; }

        public bool WalkInActive { get; set; }
        public int PendingReportsCount { get; set; }
        public int PendingCollectionsCount { get; set; }
        public int CompletedCollectionsCount { get; set; }
        public int TestsRunningCount { get; set; }
    }
}
