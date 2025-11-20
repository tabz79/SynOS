using System;

namespace SynOS.Models.DTOs
{
    public class AcquireLockResponseDto
    {
        public Guid LockId { get; set; }
        public DateTimeOffset ExpiresAt { get; set; }
    }
}
