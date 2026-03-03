using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Operations
{
    public class AccessionCounter
    {
        [Required]
        public Guid BranchId { get; set; }

        [Required]
        public DateOnly Date { get; set; }

        public int LastSequence { get; set; }

        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }
}
