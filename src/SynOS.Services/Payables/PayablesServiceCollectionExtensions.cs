using Microsoft.Extensions.DependencyInjection;
using SynOS.Services.Payables;

namespace SynOS.Services
{
    public static class PayablesServiceCollectionExtensions
    {
        public static IServiceCollection AddPayableServices(this IServiceCollection services)
        {
            services.AddScoped<IPayableFactWriter, PayableFactWriter>();
            return services;
        }
    }
}
