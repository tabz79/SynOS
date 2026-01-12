using Microsoft.Extensions.DependencyInjection;
using SynOS.Services.SpendEngine;

namespace SynOS.Services
{
    public static class SpendEngineServiceCollectionExtensions
    {
        public static IServiceCollection AddSpendEngineServices(this IServiceCollection services)
        {
            services.AddScoped<ISpendFactWriter, SpendFactWriter>();
            return services;
        }
    }
}
