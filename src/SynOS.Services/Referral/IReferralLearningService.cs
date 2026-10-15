using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Admin.Referral;

namespace SynOS.Services.Referral
{
    public interface IReferralLearningService
    {
        Task<List<PendingLearningDoctorGroupDto>> GetPendingLearningQueueAsync();
        Task<CommitLearningBatchResponseDto> CommitLearnedRatesAsync(CommitLearningBatchRequestDto request, Guid userId);
        Task<List<DoctorLearnedRuleReadDto>> GetLearnedRulesForDoctorAsync(Guid partnerId);
        Task<List<DoctorLearnedRuleReadDto>> SearchAllLearnedRulesAsync(string? query = null);
        Task DeleteLearnedRuleAsync(Guid ruleId);
    }
}
