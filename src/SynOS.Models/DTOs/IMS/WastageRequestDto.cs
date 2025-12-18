using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums.IMS;

namespace SynOS.Models.DTOs.IMS
{
    public class WastageRequestDto
    {
        [Required]
        public Guid ConsumableId { get; set; }

        [Required]
        public Guid LotId { get; set; }

        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }

        [Required]
        public WastageReasonCode ReasonCode { get; set; }
    }
}
