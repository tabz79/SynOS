using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class RadiologyDictationSession
    {
        [Key]
        public Guid SessionId { get; set; }

        [Required]
        public Guid StudyId { get; set; }

        [ForeignKey("StudyId")]
        public virtual RadiologyStudy RadiologyStudy { get; set; }

        public Guid? TypistUserId { get; set; }

        [ForeignKey("TypistUserId")]
        public virtual User Typist { get; set; }

        public Guid? RadiologistUserId { get; set; }

        [ForeignKey("RadiologistUserId")]
        public virtual User Radiologist { get; set; }

        [Required]
        [StringLength(50)]
        public string SessionStatus { get; set; } = "Awaiting"; // Awaiting, Active, Ended

        public string? LiveDraftFindings { get; set; }
        public string? LiveDraftImpression { get; set; }
        public string? LiveDraftNotes { get; set; }

        [StringLength(50)]
        public string AudioChannelState { get; set; } = "Disconnected"; // Connected, Disconnected

        public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? EndedAt { get; set; }
    }
}
