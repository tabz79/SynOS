using Microsoft.Extensions.DependencyInjection;

namespace SynOS.Services.Assignment
{
    public static class AssignmentServiceCollectionExtensions
    {
        public static IServiceCollection AddAssignmentServices(this IServiceCollection services)
        {
            services.AddScoped<IWorkRoutingEngine, WorkRoutingEngine>();
            return services;
        }
    }
}
