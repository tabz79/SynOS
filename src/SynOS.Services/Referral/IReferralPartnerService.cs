using SynOS.Models.DTOs.Admin.Referral;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SynOS.Services.Referral
{
    public interface IReferralPartnerService
    {
        Task<ReferralPartnerReadDto> CreateReferralPartnerAsync(ReferralPartnerCreateDto createDto, Guid userId);
        Task<IEnumerable<ReferralPartnerReadDto>> GetAllReferralPartnersAsync();
        Task<ReferralPartnerReadDto> GetReferralPartnerByIdAsync(Guid id);
        Task<ReferralPartnerReadDto> UpdateReferralPartnerAsync(Guid id, ReferralPartnerUpdateDto updateDto, Guid userId);
        Task DeleteReferralPartnerAsync(Guid id); // Soft delete
    }
}