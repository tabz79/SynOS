using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs;

namespace SynOS.Services
{
    public interface IReceptionFlowService
    {
        Task<ReceptionStartVisitResponse> StartVisitAsync(ReceptionStartVisitRequest request, Guid actorUserId);
        Task<ReceptionStartVisitResponse> AddTestAsync(Guid visitId, string testCode, Guid actorUserId);
        Task<ReceptionStartVisitResponse> RemoveTestAsync(Guid visitId, string testCode, Guid actorUserId);
        Task SetVisitReferralAsync(Guid visitId, Guid referralPartnerId, Guid actorUserId);
        Task RemoveVisitReferralAsync(Guid visitId, Guid actorUserId);
        Task UpdateVisitReferrerTextAsync(Guid visitId, string? referrerText, Guid actorUserId);
        Task MarkVisitAsPrepaidAsync(Guid visitId, Guid actorUserId);
        Task<ReceptionCompletePaymentResponse> CompletePaymentAsync(ReceptionCompletePaymentRequest request, Guid userId);
        Task<ReceptionVisitSummaryResponse> GetVisitSummaryAsync(Guid visitId);
        
        // Added for Discount Wiring
        Task ApplyDiscountAsync(Guid visitId, string discountCode, Guid actorUserId);
        Task RemoveDiscountAsync(Guid visitId, Guid actorUserId);

        // Added for Referral Draft
        Task AddReferralDraftAsync(Guid visitId, string providerName, string? clinicName, string? location, Guid actorUserId);

        Task ResolveReferralDraftAsync(Guid draftId, Guid targetPartnerId, Guid actorUserId);
    }
}
