using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class Order
    {
        [Key]
        public Guid OrderId { get; set; }

        [Required]
        public Guid VisitId { get; set; }

        [ForeignKey("VisitId")]
        public Visit? Visit { get; set; }

        [Required]
        [StringLength(50)]
        public string TestCode { get; set; } = string.Empty;

        [ForeignKey("TestCode")]
        public TestDefinition? TestDefinition { get; set; }

        [Required]
        [StringLength(50)]
        public string Department { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = string.Empty;

        [Column(TypeName = "decimal(10, 2)")]
        public decimal Price { get; set; }

        [Column(TypeName = "decimal(10, 2)")]
        public decimal Discount { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
