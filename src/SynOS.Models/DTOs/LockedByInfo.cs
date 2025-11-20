using System;

namespace SynOS.Models.DTOs
{
    public class LockedByInfo
    {
        public string Name { get; set; }
        public DateTimeOffset ExpiresAt { get; set; }
    }
}
