using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.IMS
{
    public class LotCreateDto
    {
        [Required]
        public Guid TubeId { get; set; }

        [Required]
        public Guid BranchId { get; set; }

        [Required]
        [StringLength(50)]
        public string LotNumber { get; set; }

        [Required]
        public DateTimeOffset ExpiryDate { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be greater than 0.")]
        public int Quantity { get; set; }
    }
}
