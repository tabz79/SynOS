using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class RadiologyStudy
    {
        [Key]
        public Guid RadiologyStudyId { get; set; }

        [Required]
        public Guid VisitTestId { get; set; }

        [ForeignKey("VisitTestId")]
        public Order Order { get; set; }

        [Required]
        public Guid VisitId { get; set; }
        
        [ForeignKey("VisitId")]
        public Visit Visit { get; set; }

        [Required]
        public Guid PatientId { get; set; }

        [ForeignKey("PatientId")]
        public Patient Patient { get; set; }

        [Required]
        [StringLength(50)]
        public string Modality { get; set; }

        [Required]
        public Guid ModalityId { get; set; }

        [ForeignKey("ModalityId")]
        public virtual ModalityMaster? ModalityMaster { get; set; }

        public string AccessionNumber { get; set; }

        [StringLength(50)]
        public string Status { get; set; } = "Pending";
        
        public bool IsSoftDeleted { get; set; } = false;

        public Guid? AssignedTo { get; set; }

        [ForeignKey("AssignedTo")]
        public User Technician { get; set; }

        [StringLength(100)]
        public string? ExternalSystemName { get; set; }

        [StringLength(100)]
        public string? ExternalAccessionNumber { get; set; }

        [StringLength(200)]
        public string? ExternalStudyInstanceUid { get; set; }

        public string? ExternalViewerUrl { get; set; }

        public Guid? PriorStudyId { get; set; }

        [ForeignKey("PriorStudyId")]
        public virtual RadiologyStudy? PriorStudy { get; set; }

        public Guid? ClaimedByUserId { get; set; }

        [ForeignKey("ClaimedByUserId")]
        public virtual User? ClaimedByUser { get; set; }

        public DateTimeOffset? ClaimedAt { get; set; }

        public Guid? ActiveSessionId { get; set; }

        public DateTimeOffset? LastActivityAt { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        [Required]
        public Guid CreatedBy { get; set; }

        [ForeignKey("CreatedBy")]
        public User Creator { get; set; }

        public ICollection<RadiologyImage> RadiologyImages { get; set; }
    }
}
