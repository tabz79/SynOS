using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.IMS
{
    public class WastageRecordDto
    {
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be greater than 0.")]
        public int Quantity { get; set; }

        [Required]
        [StringLength(200, MinimumLength = 3, ErrorMessage = "Reason must be between 3 and 200 characters.")]
        public string Reason { get; set; }
    }
}
