using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.Time
{
    public class TimePeriod
    {
        [Key]
        public Guid TimePeriodId { get; set; }
        public DateOnly PeriodDate { get; set; }
        public TimePeriodStatus Status { get; set; }
        public DateTime? LockedAt { get; set; }
    }
}
