using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;

namespace SynOS.Services
{
    public interface IReceptionFlowService
    {
        Task<ReceptionStartVisitResponse> StartVisitAsync(ReceptionStartVisitRequest request, Guid actorUserId);
        Task<ReceptionStartVisitResponse> AddTestAsync(Guid visitId, string testCode, Guid actorUserId);
        Task<ReceptionStartVisitResponse> AddOutsourcedTestAsync(Guid visitId, string testName, decimal price, decimal? outsourceCost, Guid? referenceLabId, Guid actorUserId);
        Task<ReceptionStartVisitResponse> RemoveTestAsync(Guid visitId, string testCode, Guid actorUserId);
        Task<ReceptionStartVisitResponse> RemoveOrderAsync(Guid visitId, Guid orderId, Guid actorUserId);
        Task SetVisitReferralAsync(Guid visitId, Guid referralPartnerId, Guid actorUserId);
        Task RemoveVisitReferralAsync(Guid visitId, Guid actorUserId);
        Task UpdateReferrerTextAsync(Guid visitId, string? referrerText, Guid actorUserId);
        Task SetVisitCollectionModelAsync(Guid visitId, string model, Guid actorUserId);
        Task MarkVisitAsPrepaidAsync(Guid visitId, Guid actorUserId);
        Task<ReceptionCompletePaymentResponse> CompletePaymentAsync(ReceptionCompletePaymentRequest request, Guid userId);
        Task<ReceptionVisitSummaryResponse> GetVisitSummaryAsync(Guid visitId);
        
        // Added for Discount Wiring
        Task ApplyDiscountAsync(Guid visitId, string discountCode, Guid actorUserId);
        Task RemoveDiscountAsync(Guid visitId, Guid actorUserId);

        // Added for Referral Draft
        Task AddReferralDraftAsync(Guid visitId, string providerName, string? clinicName, string? location, Guid actorUserId);

        Task ResolveReferralDraftAsync(Guid draftId, Guid targetPartnerId, Guid actorUserId);

        Task TransitionToSpecimenPlannedAsync(Guid visitId); // ADDED: Specimen Architecture

        Task ReassignVisitAsync(Guid visitId, Guid newReceptionistId, Guid actorUserId);
        Task<IEnumerable<TestSummaryDto>> GetOutsourcedTestCatalogAsync();
        Task<IEnumerable<ReferenceLabDto>> GetReferenceLabsAsync();
    }

    public class TestSummaryDto
    {
        public Guid TestId { get; set; }
        public string TestCode { get; set; } = string.Empty;
        public string TestName { get; set; } = string.Empty;
        public string? Department { get; set; }
        public decimal BasePrice { get; set; }
        public List<LabRateRuleDto> LabRates { get; set; } = new();
    }

    public class LabRateRuleDto
    {
        public Guid LabId { get; set; }
        public decimal Cost { get; set; }
    }

    public class ReferenceLabDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
    }
}
