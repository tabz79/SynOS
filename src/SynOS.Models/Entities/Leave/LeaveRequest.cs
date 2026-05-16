using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.Leave
{
    [Table("LeaveRequests", Schema = "HR")]
    public class LeaveRequest
    {
        [Key]
        public Guid LeaveRequestId { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public LeaveType LeaveType { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected

        public string? SupervisorNote { get; set; }

        public Guid? ActionedByUserId { get; set; }
        public DateTime? ActionedAt { get; set; }

        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
    }
}
