using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.HealthCards;

namespace SynOS.Services.HealthCards
{
    public interface IHealthCardService
    {
        Task<IEnumerable<HealthCardPlanDto>> GetActivePlansAsync();
        Task<HealthCardSummaryDto> IssueCardAsync(IssueHealthCardRequestDto request, Guid cashierUserId, string cashierUserName, Guid branchId);
        Task<HealthCardEligibilityCheckDto> CheckEligibilityAsync(Guid? patientId, string? phoneNumber);
        Task<HealthCardBeneficiaryDto> EnrollBeneficiaryAsync(Guid cardId, EnrollBeneficiaryRequestDto request, Guid cashierUserId);
        Task<bool> RecordCardUsageAsync(RecordCardUsageRequestDto request, Guid cashierUserId, string cashierUserName);
        Task<bool> AttachCardToVisitAsync(Guid visitId, Guid planId, Guid cashierUserId);
        Task<HealthCardSummaryDto> ActivatePendingCardAsync(Guid cardId, string paymentMode, Guid cashierUserId);
        Task<HealthCardSummaryDto?> ActivateCardForVisitAsync(Guid visitId, string paymentMode, Guid cashierUserId);
        Task<IEnumerable<HealthCardSummaryDto>> GetCardsAsync(string? searchQuery, int limit = 50);
        Task<HealthCardSummaryDto?> GetCardByIdAsync(Guid cardId);
        Task<HealthCardSummaryDto?> GetCardByPatientIdAsync(Guid patientId);
        Task<HealthCardSummaryDto> UpdateCardAsync(Guid cardId, UpdateHealthCardRequestDto request, Guid cashierUserId);
        Task<bool> CancelCardAsync(Guid cardId, string? reason, Guid cashierUserId);
        Task<bool> RemoveBeneficiaryAsync(Guid cardId, Guid beneficiaryId, Guid cashierUserId);
    }
}
