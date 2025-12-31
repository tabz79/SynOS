using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Admin.Referral;

namespace SynOS.Services.Referral
{
    public interface IReferralPartnerService
    {
        Task<ReferralPartnerReadDto> CreateReferralPartnerAsync(ReferralPartnerCreateDto createDto);
        Task<IEnumerable<ReferralPartnerReadDto>> GetAllReferralPartnersAsync();
        Task<ReferralPartnerReadDto> GetReferralPartnerByIdAsync(Guid id);
        Task<ReferralPartnerReadDto> UpdateReferralPartnerAsync(Guid id, ReferralPartnerUpdateDto updateDto);
        Task DeleteReferralPartnerAsync(Guid id);
    }
}
