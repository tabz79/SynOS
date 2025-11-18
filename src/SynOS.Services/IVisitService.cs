using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface IVisitService
    {
        Task<Visit> CreateVisitAsync(VisitCreateDto visitDto, string? idempotencyKey = null);
        Task<Visit?> GetVisitDetailsAsync(Guid visitId);
        Task<IEnumerable<Visit>> GetVisitsAsync(string department, string status, int limit);
        Task<Payment?> RecordPaymentAsync(Guid visitId, PaymentRequestDto paymentDto);
        Task<VisitCancellation> CancelVisitAsync(Guid visitId, CancelRequestDto cancelDto);
    }
}
