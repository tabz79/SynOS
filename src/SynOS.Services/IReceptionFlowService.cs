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
        Task<ReceptionCompletePaymentResponse> CompletePaymentAsync(ReceptionCompletePaymentRequest request, Guid userId);
        Task<ReceptionVisitSummaryResponse> GetVisitSummaryAsync(Guid visitId);
    }
}
