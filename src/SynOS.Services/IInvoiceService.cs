using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs;
using SynOS.Models.DTOs.Dashboard;
using SynOS.Models.Entities; // ADDED

namespace SynOS.Services
{
    public interface IInvoiceService
    {
        Task<Payment> RecordPaymentAsync(Guid invoiceId, PaymentRequestDto request);
        Task<RevenueStatsDto> GetDailyRevenueStatsAsync(Guid branchId, Guid? userId = null);
        Task<InvoicePrintDto> GetInvoiceForPrintingAsync(Guid invoiceId); // RESTORED
    }
}
