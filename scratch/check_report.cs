
using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using Microsoft.Extensions.Configuration;

var builder = new ConfigurationBuilder().AddJsonFile("src/SynOS.Api/appsettings.json");
var config = builder.Build();

var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
optionsBuilder.UseSqlServer(config.GetConnectionString("DefaultConnection"));

using var context = new SynOSDbContext(optionsBuilder.Options);
var report = context.Reports.FirstOrDefault(r => r.ReportId.ToString().StartsWith("872d6e05"));
if (report != null) {
    Console.WriteLine($"ReportId: {report.ReportId}");
    Console.WriteLine($"Status: {report.Status}");
    Console.WriteLine($"FinalSnapshotJson Length: {report.FinalSnapshotJson?.Length ?? 0}");
    Console.WriteLine($"DraftSnapshotJson Length: {report.DraftSnapshotJson?.Length ?? 0}");
} else {
    Console.WriteLine("Report 872d6e05 not found!");
}
