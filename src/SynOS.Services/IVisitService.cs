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
        Task<Visit> AddTestToVisitAsync(Guid visitId, string testCode, Guid actorUserId);
        Task<Visit> RemoveTestFromVisitAsync(Guid visitId, string testCode, Guid actorUserId);
        Task<Visit?> GetVisitDetailsAsync(Guid visitId);
        Task<IEnumerable<Visit>> GetVisitsAsync(string department, string status, int limit);
        Task<VisitCancellation> CancelVisitAsync(Guid visitId, CancelRequestDto cancelDto);
        Task<VisitTokenPrintDto> GetVisitTokenForPrintingAsync(Guid visitId);
        Task ApplyDiscountToVisitAsync(Guid visitId, Guid discountMasterId, Guid actorUserId);
        Task RemoveDiscountFromVisitAsync(Guid visitId, Guid actorUserId);
    }
}
