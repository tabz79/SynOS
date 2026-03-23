using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SynOS.Data;
using SynOS.Models.Entities.Catalog;

namespace SynOS.Debug
{
    class DbCheck
    {
        static async System.Threading.Tasks.Task Main(string[] args)
        {
            var services = new ServiceCollection();
            services.AddDbContext<SynOSDbContext>(options =>
                options.UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;MultipleActiveResultSets=true"));

            var serviceProvider = services.BuildServiceProvider();
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();

            Console.WriteLine("--- Catalog Tests ---");
            var tests = await context.CatalogTests.ToListAsync();
            foreach (var test in tests)
            {
                Console.WriteLine($"Test: {test.TestCode} - {test.TestName} ({test.DepartmentCode})");
            }

            Console.WriteLine("\n--- Catalog Parameters ---");
            var parameters = await context.CatalogParameters.ToListAsync();
            foreach (var p in parameters)
            {
                Console.WriteLine($"Param: {p.TestCode} -> {p.ParameterCode} ({p.PrintName}) Group: {p.DisplayGroup}");
            }
        }
    }
}
