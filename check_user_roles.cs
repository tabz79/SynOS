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
    var userId = Guid.Parse("bcf01eba-6679-4041-84cd-a7418188106a");
    var ubrs = context.UserBranchRoles
        .Where(ubr => ubr.UserId == userId)
        .Include(ubr => ubr.Role)
        .Include(ubr => ubr.Branch)
        .ToList();

    Console.WriteLine($"Roles for User {userId}:");
    foreach (var ubr in ubrs)
    {
        Console.WriteLine($"- Branch: {ubr.Branch.Name} ({ubr.BranchId}), Role: {ubr.Role.Name} ({ubr.RoleId})");
    }

    if (ubrs.Count == 0)
    {
        Console.WriteLine("No Branch Roles found.");
    }
}
