using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.IMS
{
    public class PurchaseOrderCreateDto
    {
        [Required]
        public Guid SupplierId { get; set; }
    }
}
