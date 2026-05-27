using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    [Table("Workspaces")]
    public class Workspace
    {
        [Key]
        public Guid WorkspaceId { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty; // e.g., "Reception"

        [Required]
        [StringLength(100)]
        public string RoutePath { get; set; } = string.Empty; // e.g., "/reception"

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
