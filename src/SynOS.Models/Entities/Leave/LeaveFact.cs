using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums; // Assuming LeaveType enum will be here

namespace SynOS.Models.Entities.Leave
{
    public class LeaveFact
    {
        [Key]
        public Guid LeaveFactId { get; set; }
        public Guid EmployeeId { get; set; }
        public LeaveType LeaveType { get; set; } // Enum for Sick, Vacation, etc.
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public bool IsPaid { get; set; }
        public DateTime ApprovalTimestamp { get; set; } // Non-nullable as per design
        public Guid AuthorId { get; set; } // Non-nullable as per design
        public DateTime RecordedTimestamp { get; set; } // When the fact was recorded
    }
}