using Microsoft.Extensions.DependencyInjection;

namespace SynOS.Services.Governance
{
    public static class GovernanceServiceCollectionExtensions
    {
        public static IServiceCollection AddGovernanceServices(this IServiceCollection services)
        {
            services.AddScoped<IAuthorizationService, AuthorizationService>();
            return services;
        }
    }
}
