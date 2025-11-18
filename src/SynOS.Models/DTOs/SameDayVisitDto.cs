using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class SameDayVisitDto
    {
        public bool HasSameDayVisits { get; set; }
        public bool SuggestCombineBilling { get; set; }
        public IEnumerable<SameDayVisitDetailsDto> Visits { get; set; } = new List<SameDayVisitDetailsDto>();
    }

    public class SameDayVisitDetailsDto
    {
        public Guid AppointmentId { get; set; }
        public DateTime ScheduledFor { get; set; }
        public string Department { get; set; } = string.Empty;
    }
}
