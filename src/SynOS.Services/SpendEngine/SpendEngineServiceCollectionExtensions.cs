using Microsoft.Extensions.DependencyInjection;
using SynOS.Services.SpendEngine; // Explicitly using the SpendEngine namespace for clarity

namespace SynOS.Services.SpendEngine // As per instructions, namespace MUST be SynOS.Services.SpendEngine
{
    public static class SpendEngineServiceCollectionExtensions
    {
        /// <summary>
        /// Adds the Spend Engine services to the specified <see cref="IServiceCollection"/>.
        /// This is an opt-in registration and does not modify Program.cs directly.
        /// </summary>
        /// <param name="services">The <see cref="IServiceCollection"/> to add the services to.</param>
        /// <returns>The <see cref="IServiceCollection"/> so that additional calls can be chained.</returns>
        public static IServiceCollection AddSpendEngine(this IServiceCollection services)
        {
            // Register ISpendService -> SpendService as scoped
            services.AddScoped<ISpendService, SpendService>();

            return services;
        }
    }
}