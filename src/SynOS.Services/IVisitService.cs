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
        Task<Visit> RemoveOrderAsync(Guid visitId, Guid orderId, Guid actorUserId);
        Task<Visit?> GetVisitDetailsAsync(Guid visitId);
        Task<IEnumerable<Visit>> GetVisitsAsync(string department, Models.Enums.VisitStatus status, int limit);
        Task<VisitCancellation> CancelVisitAsync(Guid visitId, CancelRequestDto cancelDto);
        Task<VisitTokenPrintDto> GetVisitTokenForPrintingAsync(Guid visitId);
        Task ApplyDiscountToVisitAsync(Guid visitId, Guid discountMasterId, Guid actorUserId);
        Task RemoveDiscountFromVisitAsync(Guid visitId, Guid actorUserId);
        Task SetVisitReferralAsync(Guid visitId, Guid referralPartnerId, Guid actorUserId);
        Task RemoveVisitReferralAsync(Guid visitId, Guid actorUserId);
        Task UpdateVisitReferrerTextAsync(Guid visitId, string? referrerText, Guid actorUserId);
        Task MarkVisitAsPrepaidAsync(Guid visitId, Guid actorUserId, Guid? intentId = null);
        Task<string> AssignOfficialTokenAsync(Guid visitId, Guid actorUserId);
        Task RecalculateFinancialsAsync(Guid visitId, Guid actorUserId);
        // bool IsPhysicallyLocked(Visit visit);
    }
}
