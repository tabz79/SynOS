using System;
using System.Threading.Tasks;

namespace SynOS.Services.Settlements
{
    public interface ISettlementService
    {
        Task SettleReferralPayableAsync(Guid id);
        Task SettleReceivableAsync(Guid id);
    }
}
