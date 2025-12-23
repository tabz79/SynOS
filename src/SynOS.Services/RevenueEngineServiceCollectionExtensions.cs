using Microsoft.Extensions.DependencyInjection;
using SynOS.Services.Revenue;

namespace SynOS.Services
{
    public static class RevenueEngineServiceCollectionExtensions
    {
        /// <summary>
        /// Adds the Revenue Engine services to the IServiceCollection.
        /// This is an opt-in registration as the Revenue Engine has specific, limited responsibilities.
        /// </summary>
        /// <param name="services">The IServiceCollection to add the services to.</param>
        /// <returns>The updated IServiceCollection.</returns>
        public static IServiceCollection AddRevenueEngine(this IServiceCollection services)
        {
            // Register the write-only Revenue Fact Writer.
            // This is the sole service of the Revenue Engine core.
            services.AddScoped<IRevenueFactWriter, RevenueFactWriter>();

            return services;
        }
    }
}
