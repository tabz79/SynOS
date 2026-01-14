using Microsoft.Extensions.DependencyInjection;

namespace SynOS.Services.Operational
{
    public static class OperationalServiceCollectionExtensions
    {
        public static IServiceCollection AddOperationalServices(this IServiceCollection services)
        {
            services.AddScoped<IOperationalEventWriter, OperationalEventWriter>();
            return services;
        }
    }
}
