using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Referrals;

namespace SynOS.Services
{
    public interface IReferralInterpretationService
    {
        Task<List<LedgerEntryDto>> GetPartnerStatementAsync(Guid referralPartnerId, DateTimeOffset? startDate, DateTimeOffset? endDate);
        Task<PartnerFinancialSummaryDto> GetPartnerFinancialSummaryAsync(Guid referralPartnerId);
        Task<SystemReferralExposureDto> GetSystemReferralExposureAsync();
    }
}
