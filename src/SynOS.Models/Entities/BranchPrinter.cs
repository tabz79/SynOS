using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class BranchPrinter
    {
        [Key]
        public Guid PrinterId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid BranchId { get; set; }

        [ForeignKey("BranchId")]
        public virtual Branch? Branch { get; set; }

        [Required]
        [StringLength(100)]
        public string PrinterName { get; set; } = string.Empty; // e.g., "EPSON TM-T82III"

        [StringLength(50)]
        public string? PrinterType { get; set; } // e.g., "Thermal80mm", "BarcodeZebra"

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
