using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.HRMS.Interpretation
{
    public class AttendanceLeaveSummaryView
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public DateOnly Month { get; set; }
        
        public List<DailyStatus> DailyStatuses { get; set; } = new();
        
        public int TotalPresentDays { get; set; }
        public int TotalLeaveDays { get; set; }
        public int TotalAbsentDays { get; set; }
    }

    public class DailyStatus
    {
        public DateOnly Date { get; set; }
        public string Status { get; set; } = string.Empty; // "Present", "Leave: Sick", "Absent", "Weekend"
        public decimal WorkedHours { get; set; }
        public bool IsLeave { get; set; }
        public string LeaveType { get; set; } = string.Empty;
    }
}
