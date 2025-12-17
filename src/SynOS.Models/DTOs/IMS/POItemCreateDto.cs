using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.IMS
{
    public class POItemCreateDto
    {
        [Required]
        public Guid TubeId { get; set; }

        [Required]
        [Range(1, int.MaxValue)]
        public int OrderedQuantity { get; set; }

        [Required]
        [Range(0.01, (double)decimal.MaxValue)]
        public decimal UnitPrice { get; set; }

        [Range(0, 1)] // Tax rate as a decimal, e.g., 0.05 for 5%
        public decimal TaxRate { get; set; } = 0.00m;
    }
}
