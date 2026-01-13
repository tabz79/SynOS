using Microsoft.Extensions.DependencyInjection;

namespace SynOS.Services.HRMS.IntelligenceWiring
{
    public static class HrmsIntelligenceWiringServiceCollectionExtensions
    {
        public static IServiceCollection AddHrmsIntelligenceWiring(this IServiceCollection services)
        {
            services.AddScoped<IHrmsEconomicIntelligenceAdapter, HrmsEconomicIntelligenceAdapter>();
            services.AddScoped<IHrmsBusinessIntelligenceAdapter, HrmsBusinessIntelligenceAdapter>();
            return services;
        }
    }
}
