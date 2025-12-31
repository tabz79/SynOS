using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Admin.Referral;

namespace SynOS.Services.Referral
{
    public interface IReferralCommissionService
    {
        Task<ReferralCommissionRuleReadDto> CreateCommissionRuleAsync(Guid partnerId, ReferralCommissionRuleCreateDto createDto);
        Task<IEnumerable<ReferralCommissionRuleReadDto>> GetCommissionRulesForPartnerAsync(Guid partnerId);
        Task<ReferralCommissionRuleReadDto> UpdateCommissionRuleAsync(Guid ruleId, ReferralCommissionRuleUpdateDto updateDto);
        Task DeleteCommissionRuleAsync(Guid ruleId);
    }
}
