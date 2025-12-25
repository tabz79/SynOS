using Microsoft.Extensions.DependencyInjection;
using SynOS.Services.EconomicsIntelligence;

namespace SynOS.Services
{
    public static class EconomicsIntelligenceServiceCollectionExtensions
    {
        /// <summary>
        /// Adds the Economics Intelligence Layer services to the IServiceCollection.
        /// Registers IEconomicsIntelligenceService as a read-only service.
        /// </summary>
        /// <param name="services">The IServiceCollection to add the services to.</param>
        /// <returns>The updated IServiceCollection.</returns>
        public static IServiceCollection AddEconomicsIntelligence(this IServiceCollection services)
        {
            services.AddScoped<IEconomicsIntelligenceService, EconomicsIntelligenceService>();

            return services;
        }
    }
}
