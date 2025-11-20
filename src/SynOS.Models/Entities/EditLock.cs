using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class EditLock
    {
        [Key]
        public Guid LockId { get; set; }

        [Required]
        [MaxLength(100)]
        public string EntityType { get; set; }

        [Required]
        public Guid EntityId { get; set; }

        [Required]
        public Guid LockedByUserId { get; set; }

        [ForeignKey("LockedByUserId")]
        public virtual User LockedBy { get; set; }

        [Required]
        public DateTimeOffset LockedAt { get; set; }

        [Required]
        public DateTimeOffset ExpiresAt { get; set; }

        [Required]
        public EditLockStatus Status { get; set; }
    }
}
