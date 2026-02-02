using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.Operations
{
    public class WorkAssignment : BaseEntity
    {
        [Key]
        public Guid AssignmentId { get; set; }

        [Required]
        public WorkType WorkType { get; set; }

        [Required]
        public Guid SourceReferenceId { get; set; } // e.g., VisitId, OrderId

        [Required]
        [MaxLength(50)]
        public string Department { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? RequiredRole { get; set; }

        public Guid? AssignedResourceId { get; set; }

        [ForeignKey("AssignedResourceId")]
        public virtual OperationalResource? AssignedResource { get; set; }

        [Required]
        public WorkAssignmentStatus Status { get; set; }

        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }

        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }
}
