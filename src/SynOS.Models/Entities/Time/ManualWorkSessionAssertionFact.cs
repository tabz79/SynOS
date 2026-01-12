using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Time
{
    public class ManualWorkSessionAssertionFact
    {
        [Key]
        public Guid ManualWorkSessionAssertionFactId { get; set; }
        public Guid EmployeeId { get; set; }
        public DateTime EffectiveTimestamp { get; set; } // Assertion Date
        public DateTime RecordedTimestamp { get; set; }
        public Guid AuthorId { get; set; }
        public DateTime AssertedStartTime { get; set; }
        public DateTime AssertedEndTime { get; set; }
        public string ReasonCode { get; set; } // e.g., MissedPunch, SupervisorOverride
    }
}
