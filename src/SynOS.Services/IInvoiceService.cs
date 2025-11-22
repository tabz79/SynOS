using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface IInvoiceService
    {
        Task<Payment> RecordPaymentAsync(Guid invoiceId, PaymentRequestDto paymentDto);
        Task<InvoicePrintDto> GetInvoiceForPrintingAsync(Guid invoiceId);
    }
}
