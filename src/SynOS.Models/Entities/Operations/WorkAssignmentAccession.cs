using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Operations
{
    public class WorkAssignmentAccession
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid WorkAssignmentId { get; set; }

        [ForeignKey("WorkAssignmentId")]
        public virtual WorkAssignment WorkAssignment { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string TubeCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string SpecimenType { get; set; } = string.Empty;

        public int TubeCount { get; set; }

        [Required]
        [MaxLength(50)]
        public string AccessionNumber { get; set; } = string.Empty;

        public int Sequence { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
