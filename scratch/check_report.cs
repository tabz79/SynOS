using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using SynOS.Data;

namespace SynOS.Scratch
{
    public class CheckReportStatus
    {
        public static async Task Run(IServiceProvider services)
        {
            var context = services.GetRequiredService<SynOSDbContext>();
            var reportId = Guid.Parse("90584e70-50cf-4a10-a8a7-4afe3d6cb56c");
            var report = context.Reports.FirstOrDefault(r => r.ReportId == reportId);
            
            if (report != null)
            {
                Console.WriteLine($"Report ID: {report.ReportId}");
                Console.WriteLine($"Status: {report.Status}");
                Console.WriteLine($"IsManualFlow: {report.IsManualFlow}");
                Console.WriteLine($"VerificationMode: {report.VerificationMode}");
            }
            else
            {
                Console.WriteLine("Report not found.");
            }
        }
    }
}
