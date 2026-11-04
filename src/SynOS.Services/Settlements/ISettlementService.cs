using System;
using System.Threading.Tasks;

namespace SynOS.Services.Settlements
{
    public interface ISettlementService
    {
        Task SettleReferralPayableAsync(Guid id, decimal amount);
        Task SettleReceivableAsync(Guid id, decimal amount);
        Task SettleBulkPartnerReceivablesAsync(Guid partnerId, System.Collections.Generic.List<Guid> factIds, decimal totalAmount, string paymentMode, string? reference = null);
        Task SettleBulkReferralPayablesAsync(Guid partnerId, System.Collections.Generic.List<Guid> factIds, decimal totalAmount, string paymentMethod);

        Task<System.Collections.Generic.List<SynOS.Models.DTOs.Revenue.TodayB2BReceivableGroupDto>> GetTodayB2BReceivablesAsync(Guid branchId);
        Task<SynOS.Models.DTOs.Revenue.B2BSettlementReceiptDto> SettleSameDayB2BReceivablesAsync(SynOS.Models.DTOs.Revenue.SettleSameDayB2BRequestDto request, Guid userId, Guid branchId);
        Task<System.Collections.Generic.List<SynOS.Models.DTOs.Revenue.TodayB2BSettlementHistoryDto>> GetTodayB2BSettlementsHistoryAsync(Guid branchId);
    }
}
