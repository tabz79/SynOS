
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SynOS.Data;

var host = Host.CreateDefaultBuilder(args)
    .ConfigureServices((hostContext, services) =>
    {
        services.AddDbContext<SynOSDbContext>(options =>
            options.UseSqlServer("Server=(localdb)\\mssqllocaldb;Database=SynOS_Dev;Trusted_Connection=True;MultipleActiveResultSets=true"));
    })
    .Build();

using var scope = host.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();

Console.WriteLine("--- Department Masters ---");
var depts = await db.DepartmentMasters.ToListAsync();
foreach (var d in depts)
{
    Console.WriteLine($"ID: {d.DepartmentId}, Code: {d.Code}, Name: {d.Name}");
}

Console.WriteLine("\n--- Catalog Tests ---");
var tests = await db.CatalogTests.Include(t => t.DepartmentMaster).Take(20).ToListAsync();
foreach (var t in tests)
{
    Console.WriteLine($"Code: {t.TestCode}, Name: {t.TestName}, DeptCode: {t.DepartmentCode}, ResolvedDept: {t.DepartmentMaster?.Code}");
}

Console.WriteLine("\n--- Recent Orders ---");
var orders = await db.Orders.OrderByDescending(o => o.CreatedAt).Take(10).ToListAsync();
foreach (var o in orders)
{
    Console.WriteLine($"Test: {o.TestCode}, Dept: {o.Department}, Status: {o.Status}");
}

Console.WriteLine("\n--- Recent Processing Assignments ---");
var assignments = await db.ProcessingAssignments.OrderByDescending(a => a.CreatedAt).Take(10).ToListAsync();
foreach (var a in assignments)
{
    Console.WriteLine($"Specimen: {a.SpecimenId}, Dept: {a.DepartmentCode}, Status: {a.Status}");
}
