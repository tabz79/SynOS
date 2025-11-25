using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class CriticalContact
    {
        [Key]
        public Guid ContactId { get; set; }

        public Guid? ReferrerId { get; set; }
        [ForeignKey("ReferrerId")]
        public virtual Referrer? Referrer { get; set; }

        [Required]
        [MaxLength(200)]
        public string ContactName { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(200)]
        public string? Email { get; set; }

        public int Priority { get; set; } = 1;
        
        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
