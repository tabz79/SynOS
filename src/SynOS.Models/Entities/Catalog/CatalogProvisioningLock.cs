using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Catalog
{
    public class CatalogProvisioningLock
    {
        [Key]
        public int LockId { get; set; } = 1; // Always 1
        public bool IsLocked { get; set; }
        public DateTimeOffset? LockedAt { get; set; }
        public string? LockedBySessionId { get; set; }
    }
}
