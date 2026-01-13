using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.HRMS.Interpretation
{
    public class AuditTimelineView
    {
        public Guid EntityId { get; set; } // EmployeeId or PayrollRunId
        public string EntityName { get; set; } = string.Empty;
        
        public List<TimelineEvent> Events { get; set; } = new();
    }

    public class TimelineEvent
    {
        public DateTime Timestamp { get; set; }
        public string SourceModule { get; set; } = string.Empty; // "HR", "Time", "Payroll", "Spend"
        public string EventType { get; set; } = string.Empty; // "ShiftWorked", "LeaveApproved", "PaymentSent"
        public string Description { get; set; } = string.Empty;
        public Guid FactId { get; set; }
        public Guid? ActorId { get; set; }
    }
}
