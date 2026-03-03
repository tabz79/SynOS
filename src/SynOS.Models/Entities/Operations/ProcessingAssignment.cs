using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.Operations
{
    public class ProcessingAssignment
    {
        [Key]
        public Guid ProcessingAssignmentId { get; set; }

        [Required]
        public Guid SpecimenId { get; set; }

        [ForeignKey("SpecimenId")]
        public virtual Specimen? Specimen { get; set; }

        [Required]
        [MaxLength(50)]
        public string DepartmentCode { get; set; } = string.Empty;

        [Required]
        public Guid BranchId { get; set; }

        [Required]
        public ProcessingAssignmentStatus Status { get; set; } = ProcessingAssignmentStatus.Pending;

        public Guid? AssignedResourceId { get; set; }

        [ForeignKey("AssignedResourceId")]
        public virtual OperationalResource? AssignedResource { get; set; }

        [Required]
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public DateTimeOffset? StartedAt { get; set; }

        public DateTimeOffset? CompletedAt { get; set; }

        [Timestamp]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }
}
