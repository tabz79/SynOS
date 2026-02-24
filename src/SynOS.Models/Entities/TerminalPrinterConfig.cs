using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class TerminalPrinterConfig
    {
        [Key]
        [StringLength(100)]
        public string TerminalIdentifier { get; set; } = string.Empty; // Machine UUID or Persistent Browser Cookie

        [Required]
        public Guid BranchId { get; set; }

        [ForeignKey("BranchId")]
        public virtual Branch? Branch { get; set; }

        /// <summary>
        /// Authorization Flag: Only Terminals with this set to true are allowed to join
        /// the Branch-{Id}-Lead-Thermal80mm SignalR group and act as print servers for the branch.
        /// </summary>
        public bool IsLeadPrintTerminal { get; set; } = false;

        public Guid? SpecificReceiptPrinterId { get; set; }

        [ForeignKey("SpecificReceiptPrinterId")]
        public virtual BranchPrinter? SpecificReceiptPrinter { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
