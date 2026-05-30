using SynOS.Models.DTOs.Admin.Referral;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SynOS.Services.Referral
{
    public interface IReferralPartnerService
    {
        Task<ReferralPartnerReadDto> CreateReferralPartnerAsync(ReferralPartnerCreateDto createDto, Guid userId);
        Task<ReferralPartnerReadDto> CreateDraftPartnerAsync(ReferralPartnerCreateDto createDto, Guid userId);
        Task ApprovePartnerAsync(Guid partnerId, decimal commissionPercentage, Guid userId);
        Task<IEnumerable<ReferralPartnerReadDto>> GetAllReferralPartnersAsync();
        Task<ReferralPartnerReadDto> GetReferralPartnerByIdAsync(Guid id);
        Task<ReferralPartnerReadDto> UpdateReferralPartnerAsync(Guid id, ReferralPartnerUpdateDto updateDto, Guid userId);
        Task DeleteReferralPartnerAsync(Guid id, Guid userId); // Soft delete with audit
        Task<ReferralSummaryDto> GetReferralSummaryAsync(Guid? branchId = null);

        // Commission Rules
        Task<IEnumerable<ReferralCommissionRuleReadDto>> GetAllCommissionRulesAsync();
        Task<ReferralCommissionRuleReadDto> CreateCommissionRuleAsync(ReferralCommissionRuleCreateDto dto, Guid userId);
        Task DeleteCommissionRuleAsync(Guid id, Guid userId);
    }
}