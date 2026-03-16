using System;
using System.Linq;
using SynOS.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using System.IO;

var configuration = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("src/SynOS.Api/appsettings.json")
    .Build();

var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
optionsBuilder.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));

using (var context = new SynOSDbContext(optionsBuilder.Options))
{
    var roles = context.Roles.Select(r => r.Name).ToList();
    Console.WriteLine("Available Roles:");
    foreach (var role in roles)
    {
        Console.WriteLine($"- '{role}'");
    }
}
