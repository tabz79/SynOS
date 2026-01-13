using Microsoft.Extensions.DependencyInjection;

namespace SynOS.Services.Compliance
{
    public static class ComplianceServiceCollectionExtensions
    {
        public static IServiceCollection AddComplianceServices(this IServiceCollection services)
        {
            services.AddScoped<IStatutoryObligationFactWriter, StatutoryObligationFactWriter>();
            return services;
        }
    }
}
