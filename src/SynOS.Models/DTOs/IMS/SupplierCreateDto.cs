using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.IMS
{
    public class SupplierCreateDto
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        [StringLength(500)]
        public string? ContactInfo { get; set; }
    }
}
