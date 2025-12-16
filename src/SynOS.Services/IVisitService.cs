using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface IVisitService
    {
        Task<Visit> CreateVisitAsync(VisitCreateDto visitDto, string? idempotencyKey = null, Guid actorUserId = default);
        Task<Visit?> GetVisitDetailsAsync(Guid visitId);
        Task<IEnumerable<Visit>> GetVisitsAsync(string department, string status, int limit);
        Task<VisitCancellation> CancelVisitAsync(Guid visitId, CancelRequestDto cancelDto);
        Task<VisitTokenPrintDto> GetVisitTokenForPrintingAsync(Guid visitId);
    }
}
