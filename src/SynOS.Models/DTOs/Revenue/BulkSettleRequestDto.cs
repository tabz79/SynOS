using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.Revenue
{
    public class BulkSettleRequestDto
    {
        public Guid PartnerId { get; set; }
        public List<Guid> FactIds { get; set; }
        public decimal TotalAmount { get; set; }
        public string PaymentMode { get; set; } // Using string for easy mapping from frontend
    }
}
