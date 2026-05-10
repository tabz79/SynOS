using System;
using System.Threading.Tasks;

namespace SynOS.Services.Settlements
{
    public interface ISettlementService
    {
        Task SettleReferralPayableAsync(Guid id, decimal amount);
        Task SettleReceivableAsync(Guid id, decimal amount);
        Task SettleBulkPartnerReceivablesAsync(Guid partnerId, System.Collections.Generic.List<Guid> factIds, decimal totalAmount, string paymentMode);
        Task SettleBulkReferralPayablesAsync(Guid partnerId, System.Collections.Generic.List<Guid> factIds, decimal totalAmount, string paymentMethod);
    }
}
