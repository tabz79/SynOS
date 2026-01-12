using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.Time
{
    public class ClockEventFact
    {
        [Key]
        public Guid ClockEventFactId { get; set; }
        public Guid EmployeeId { get; set; }
        public DateTime EffectiveTimestamp { get; set; }
        public DateTime RecordedTimestamp { get; set; }
        public Guid AuthorId { get; set; }
        public ClockActionType Action { get; set; }
        public Guid LocationId { get; set; } // Assuming a Location entity exists
    }
}
