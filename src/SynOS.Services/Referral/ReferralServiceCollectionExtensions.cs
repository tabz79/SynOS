using Microsoft.Extensions.DependencyInjection;
using SynOS.Services.Referral;

namespace SynOS.Services
{
    public static class ReferralServiceCollectionExtensions
    {
        public static IServiceCollection AddReferralServices(this IServiceCollection services)
        {
            services.AddScoped<IReferralPartnerService, ReferralPartnerService>();
            services.AddScoped<IReferralCommissionService, ReferralCommissionService>();
            services.AddScoped<IReferralFinancialService, ReferralFinancialService>();
            return services;
        }
    }
}
