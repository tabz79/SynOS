using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class AccessionSequence
    {
        [Required]
        public Guid BranchId { get; set; } // Composite PK Part 1

        [Required]
        public DateTime Date { get; set; } // Composite PK Part 2 (Date Only)

        public int LastSequenceNumber { get; set; } = 0;

        [Timestamp]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>(); // Optimistic Concurrency Token (Safety Net)
    }
}
