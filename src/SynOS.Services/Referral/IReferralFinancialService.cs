using System.Threading.Tasks;
using SynOS.Models.Entities;

namespace SynOS.Services.Referral
{
    public interface IReferralFinancialService
    {
        Task ProcessCommissionRecognitionAsync(Visit visit);
        Task ProcessRetroactiveCommissionsAsync(Guid partnerId, decimal commissionPercentage, Guid userId);
    }
}
