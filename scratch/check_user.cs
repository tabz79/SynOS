using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

var configuration = new ConfigurationBuilder()
    .AddJsonFile("src/SynOS.Api/appsettings.json")
    .Build();

var connectionString = configuration.GetConnectionString("DefaultConnection");

var serviceProvider = new ServiceCollection()
    .AddDbContext<SynOSDbContext>(options => options.UseSqlServer(connectionString))
    .BuildServiceProvider();

using var scope = serviceProvider.CreateScope();
var context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();

var user = context.Users.FirstOrDefault(u => u.Email == "pathologist2@lab.com");

if (user == null)
{
    Console.WriteLine("User 'pathologist2@lab.com' NOT found in database.");
}
else
{
    Console.WriteLine($"User 'pathologist2@lab.com' found. Role: {user.Email}");
    // Check if it's active
    Console.WriteLine($"IsActive: {user.IsActive}");
}
