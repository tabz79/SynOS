using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Models.Enums.Referral;

namespace SynOS.Services.Referral
{
    public interface IDoctorCrmService
    {
        Task<DoctorDirectoryPagedResultDto> GetDoctorDirectoryAsync(DoctorDirectoryFilterDto filter);
        Task<DoctorProfileDetailDto> GetDoctorProfileAsync(Guid partnerId);
        Task<DoctorCrmCardDto> UpdateDoctorDemographicsAsync(Guid partnerId, UpdateDoctorDemographicsRequestDto request, Guid userId);
        Task<DoctorLearnedRuleReadDto> QuickLearnRateAsync(Guid partnerId, Guid testId, CommissionType type, decimal value, Guid userId);
    }
}
