using Microsoft.Extensions.DependencyInjection;

namespace SynOS.Services.HRMS.Interpretation
{
    public static class HrmsInterpretationServiceCollectionExtensions
    {
        public static IServiceCollection AddHrmsInterpretation(this IServiceCollection services)
        {
            services.AddScoped<IHrmsInterpretationService, HrmsInterpretationService>();
            return services;
        }
    }
}
