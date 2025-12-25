using Microsoft.Extensions.DependencyInjection;
using SynOS.Services.BusinessIntelligence;

namespace SynOS.Services
{
    public static class BusinessIntelligenceServiceCollectionExtensions
    {
        /// <summary>
        /// Adds the Business Intelligence Layer services to the IServiceCollection.
        /// This is an opt-in registration.
        /// </summary>
        /// <param name="services">The IServiceCollection to add the services to.</param>
        /// <returns>The updated IServiceCollection.</returns>
        public static IServiceCollection AddBusinessIntelligence(this IServiceCollection services)
        {
            services.AddScoped<IBusinessIntelligenceService, BusinessIntelligenceService>();

            return services;
        }
    }
}
