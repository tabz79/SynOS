using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Payables
{
    [Table("VendorPayables", Schema = "Payables")]
    public class VendorPayable
    {
        [Key]
        public Guid VendorPayableId { get; set; }

        public Guid? VendorId { get; set; }

        [StringLength(200)]
        public string? VendorName { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 4)")]
        public decimal Amount { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal AmountPaid { get; set; } = 0;

        [Required]
        [StringLength(50)]
        public string ReferenceType { get; set; } // e.g., "PO"

        [Required]
        public Guid ReferenceId { get; set; }

        [Required]
        public SynOS.Models.Enums.Payables.VendorPayableStatus Status { get; set; } = SynOS.Models.Enums.Payables.VendorPayableStatus.Pending;

        public DateTime? SettledAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
