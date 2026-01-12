using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Time
{
    public class WorkSessionBoundaryFact
    {
        [Key]
        public Guid WorkSessionBoundaryFactId { get; set; }
        public Guid EmployeeId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public DateTime RecordedTimestamp { get; set; }
        public Guid AuthorId { get; set; }
        public Guid? PairedClockEventFactId { get; set; } // Optional: Link to original clock event if system-derived
    }
}
