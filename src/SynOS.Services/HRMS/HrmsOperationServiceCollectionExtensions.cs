using Microsoft.Extensions.DependencyInjection;

namespace SynOS.Services.HRMS
{
    public static class HrmsOperationServiceCollectionExtensions
    {
        public static IServiceCollection AddHrmsOperations(this IServiceCollection services)
        {
            services.AddScoped<IHrmsOperationService, HrmsOperationService>();
            return services;
        }
    }
}
