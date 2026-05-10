using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.Admin.Referral
{
    public class BulkSettlementDto
    {
        public Guid PartnerId { get; set; }
        public List<Guid> FactIds { get; set; } = new();
        public decimal TotalAmount { get; set; }
        public string PaymentMethod { get; set; } = "BankTransfer";
    }
}
