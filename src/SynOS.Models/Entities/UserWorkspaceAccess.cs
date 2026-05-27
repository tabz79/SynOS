using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    [Table("UserWorkspaceAccesses")]
    public class UserWorkspaceAccess
    {
        [Key]
        public Guid UserWorkspaceAccessId { get; set; }

        public Guid UserId { get; set; }
        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        public Guid WorkspaceId { get; set; }
        [ForeignKey("WorkspaceId")]
        public Workspace Workspace { get; set; } = null!;

        public DateTimeOffset AssignedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
