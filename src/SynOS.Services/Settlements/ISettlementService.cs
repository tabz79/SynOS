using System;
using System.Threading.Tasks;

namespace SynOS.Services.Settlements
{
    public interface ISettlementService
    {
        Task SettleReferralPayableAsync(Guid id, decimal amount);
        Task SettleReceivableAsync(Guid id, decimal amount);
    }
}
