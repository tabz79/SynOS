using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Time
{
    public class ShiftAttributionFact
    {
        [Key]
        public Guid ShiftAttributionFactId { get; set; }
        public Guid EmployeeId { get; set; }
        public DateTime EffectiveTimestamp { get; set; } // Date of shift
        public DateTime RecordedTimestamp { get; set; }
        public Guid AuthorId { get; set; }
        public Guid WorkSessionBoundaryFactId { get; set; } // FK to a specific WorkSessionBoundaryFact
        public string ShiftType { get; set; } // e.g., "DAY_SURGICAL", "NIGHT_ER"
    }
}
