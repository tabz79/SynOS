
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = Host.CreateDefaultBuilder()
    .ConfigureServices((context, services) => {
        services.AddDbContext<SynOSDbContext>(options =>
            options.UseSqlite("Data Source=../SynOS.Api/SynOS.db")); // Adjust path as needed
    })
    .Build();

using var scope = host.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();

Console.WriteLine("--- Payroll Periods ---");
var periods = await db.PayrollPeriods.ToListAsync();
foreach (var p in periods) {
    Console.WriteLine($"ID: {p.PayrollPeriodId}, Range: {p.StartDate:yyyy-MM-dd} to {p.EndDate:yyyy-MM-dd}, Status: {p.Status}");
}

Console.WriteLine("\n--- Payroll Runs ---");
var runs = await db.PayrollRuns.ToListAsync();
foreach (var r in runs) {
    Console.WriteLine($"ID: {p.PayrollRunId}, PeriodId: {p.PayrollPeriodId}, Status: {p.Status}");
}
