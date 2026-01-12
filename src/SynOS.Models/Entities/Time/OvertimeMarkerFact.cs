using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Time
{
    public class OvertimeMarkerFact
    {
        [Key]
        public Guid OvertimeMarkerFactId { get; set; }
        public Guid EmployeeId { get; set; }
        public DateTime EffectiveTimestamp { get; set; } // Start of overtime period
        public DateTime RecordedTimestamp { get; set; }
        public Guid AuthorId { get; set; }
        public DateTime EndTime { get; set; }
    }
}
