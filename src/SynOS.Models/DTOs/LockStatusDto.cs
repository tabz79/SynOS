using System;

namespace SynOS.Models.DTOs
{
    public class LockStatusDto
    {
        public bool IsLocked { get; set; }
        public LockedByInfo LockedBy { get; set; }
    }
}
