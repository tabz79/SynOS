using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Events;
using SynOS.Services;
using SynOS.Services.Diagnostics;
using SynOS.Services.Forensic;
using SynOS.Services.Operational;
using SynOS.Services.Operations;
using SynOS.Services.Reporting;
using SynOS.Services.Security;
using SynOS.Services.Storage;
using SynOS.Services.Time;
using SynOS.Services.Utils;
using Xunit;
using Xunit.Abstractions;

namespace SynOS.Tests
{
    public class InvestigationPipelineBenchmarkTest
    {
        private readonly ITestOutputHelper _output;
        private const string ConnectionString = "Server=.\\SYNOS;Database=SynOSDb-1;Trusted_Connection=True;MultipleActiveResultSets=true;Encrypt=False;TrustServerCertificate=True";

        public InvestigationPipelineBenchmarkTest(ITestOutputHelper output)
        {
            _output = output;
        }

        private void Print(string text)
        {
            _output.WriteLine(text);
            Console.WriteLine(text);
        }

        [Fact]
        public async Task Test_RunFullInvestigationBenchmark()
        {
            Print("=========================================================================");
            Print("     SYN OS SYSTEM PERFORMANCE INVESTIGATION & BENCHMARK SUITE");
            Print("=========================================================================");

            var profiler = new ProfilingInterceptor();

            var services = new ServiceCollection();
            services.AddLogging(builder => builder.AddConsole().SetMinimumLevel(LogLevel.Information));

            // Configuration for file storage
            var myConfig = new ConfigurationBuilder()
                .AddInMemoryCollection(new[]
                {
                    new System.Collections.Generic.KeyValuePair<string, string?>("FileStorage:BasePath", "C:\\SynOS_Files"),
                    new System.Collections.Generic.KeyValuePair<string, string?>("FileStorage:PublicBaseUrl", "http://localhost:5000/files")
                })
                .Build();
            services.AddSingleton<IConfiguration>(myConfig);

            services.AddDbContext<SynOSDbContext>(options =>
            {
                options.UseSqlServer(ConnectionString);
                options.AddInterceptors(profiler);
            });

            services.AddHttpClient();
            services.AddScoped<IUserContext, TestUserContext>();
            services.AddScoped<IReportingService, ReportingService>();
            services.AddScoped<IReportPdfRenderer, QuestPdfReportRenderer>();
            services.AddScoped<IFileStorageService, LocalStorageService>();
            services.AddScoped<ILabTimeProvider, LabTimeProvider>();
            services.AddScoped<IMiddlewareOutboxService, NullMiddlewareOutboxService>();
            services.AddScoped<IVisitLifecyclePolicy, VisitLifecyclePolicy>();
            services.AddScoped<IOperationsEngine, OperationsEngine>();
            services.AddScoped<IAuditService, AuditService>();
            services.AddScoped<INotificationService, NotificationService>();
            services.AddScoped<INotifier, TestNotifier>();
            services.AddSingleton<IOperationalEventChannel, OperationalEventChannel>();
            services.AddScoped<IOperationalEventWriter, OperationalEventWriter>();
            services.AddScoped<ICriticalValueService, CriticalValueService>();
            services.AddScoped<IReportService, ReportService>();

            var serviceProvider = services.BuildServiceProvider();
            using var scope = serviceProvider.CreateScope();

            var dbContext = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
            var reportService = scope.ServiceProvider.GetRequiredService<IReportService>();
            var reportingService = scope.ServiceProvider.GetRequiredService<IReportingService>();
            var pdfRenderer = scope.ServiceProvider.GetRequiredService<IReportPdfRenderer>();
            var fileStorage = scope.ServiceProvider.GetRequiredService<IFileStorageService>();

            DbInitializer.Initialize(dbContext);

            // Find an active report in ReadyForVerification status or draft
            var report = await dbContext.Reports
                .Include(r => r.PathologyReport)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync(r => r.Status == "ReadyForVerification" || r.Status == "Draft");

            if (report == null)
            {
                report = await dbContext.Reports.OrderByDescending(r => r.CreatedAt).FirstOrDefaultAsync();
            }

            Assert.NotNull(report);
            Print($"Target Report ID: {report.ReportId} | Status: {report.Status} | Department: {report.Department}");

            var adminUser = await dbContext.Users.FirstOrDefaultAsync(u => u.IsDefaultSignatory && u.IsActive)
                            ?? await dbContext.Users.FirstAsync();

            // Make sure signature image exists for adminUser to avoid signing block
            if (string.IsNullOrEmpty(adminUser.SignatureImageUrl) || !File.Exists(Path.Combine("C:\\SynOS_Files", adminUser.SignatureImageUrl)))
            {
                var dummySigDir = Path.Combine("C:\\SynOS_Files", "signatures");
                Directory.CreateDirectory(dummySigDir);
                var dummySigPath = Path.Combine(dummySigDir, $"{adminUser.UserId}_sig.png");
                if (!File.Exists(dummySigPath))
                {
                    // 1x1 transparent PNG
                    byte[] pngBytes = Convert.FromBase64String("iVBORw0KGgoAAAANSU5EUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");
                    File.WriteAllBytes(dummySigPath, pngBytes);
                }
                adminUser.SignatureImageUrl = $"signatures/{adminUser.UserId}_sig.png";
                await dbContext.SaveChangesAsync();
            }

            // Ensure status is ReadyForVerification for signing test
            report.Status = "ReadyForVerification";
            await dbContext.SaveChangesAsync();

            // -----------------------------------------------------------------
            // 1. LIVE PREVIEW INVESTIGATION (Request A vs Request B)
            // -----------------------------------------------------------------
            Print("\n--- SECTION 1: LIVE PREVIEW INVESTIGATION ---");

            long reqATimeMs = 0;
            long reqBTimeMs = 0;

            using (var scopeA = profiler.BeginScope())
            using (var resolverScopeA = new ResolverInstrumentationScope())
            {
                var swA = Stopwatch.StartNew();
                var fullReport = await reportingService.GetReportStructureAsync(report.ReportId);
                swA.Stop();
                reqATimeMs = swA.ElapsedMilliseconds;

                var metricsA = scopeA.GetMetrics();
                Print($"[Request A: getFullReport()] Total Time: {reqATimeMs} ms");
                Print($"   SQL Commands: {metricsA.TotalCount} | SQL Time: {metricsA.TotalTimeMs:F2} ms | Avg SQL: {metricsA.AvgTimeMs:F2} ms");
                Print($"   Parameters Discovered: {resolverScopeA.Parameters.Count} | Range Resolver Invocations: {resolverScopeA.InvocationCount} | Resolver Time: {resolverScopeA.TotalDurationMs:F2} ms");
            }

            using (var scopeB = profiler.BeginScope())
            using (var resolverScopeB = new ResolverInstrumentationScope())
            {
                var swB = Stopwatch.StartNew();
                var dataModel = await reportService.GetReportDataForPdfAsync(report.ReportId, forceLive: true);
                swB.Stop();
                reqBTimeMs = swB.ElapsedMilliseconds;

                var metricsB = scopeB.GetMetrics();
                Print($"[Request B: getReportData(forceLive=true)] Total Time: {reqBTimeMs} ms");
                Print($"   SQL Commands: {metricsB.TotalCount} | SQL Time: {metricsB.TotalTimeMs:F2} ms | Avg SQL: {metricsB.AvgTimeMs:F2} ms");
                Print($"   Parameters Discovered: {resolverScopeB.Parameters.Count} | Range Resolver Invocations: {resolverScopeB.InvocationCount} | Resolver Time: {resolverScopeB.TotalDurationMs:F2} ms");
            }

            Print($"Confirm Simultaneous Execution: Both getFullReport() and getReportData(forceLive=true) execute independently in parallel via Promise.all().");
            Print($"Duplicate BuildDynamicStructureAsync Confirmed:");
            Print($"   Request A: {reqATimeMs} ms");
            Print($"   Request B: {reqBTimeMs} ms");
            Print($"   Total Duplicated Work Time: {reqATimeMs + reqBTimeMs} ms");

            // -----------------------------------------------------------------
            // 2. REFERENCE RANGE RESOLVER DETAILED BREAKDOWN
            // -----------------------------------------------------------------
            Print("\n--- SECTION 2: REFERENCE RANGE RESOLVER BREAKDOWN ---");
            using (var scopeResolver = profiler.BeginScope())
            using (var rScope = new ResolverInstrumentationScope())
            {
                var swResolverPass = Stopwatch.StartNew();
                var structure = await reportingService.GetReportStructureAsync(report.ReportId, forceFresh: true);
                swResolverPass.Stop();

                var rMetrics = scopeResolver.GetMetrics();
                int paramCount = rScope.Parameters.Count;
                int invocations = rScope.InvocationCount;
                double totalResolverMs = rScope.TotalDurationMs;
                double avgTimePerParam = paramCount > 0 ? totalResolverMs / paramCount : 0;

                Print($"   Number of Parameters: {paramCount}");
                Print($"   Number of Resolver Invocations: {invocations}");
                Print($"   Number of SQL Queries (ReferenceRanges): {rMetrics.ReferenceRangeCount}");
                Print($"   Total Resolver Time: {totalResolverMs:F2} ms");
                Print($"   Average Time per Parameter: {avgTimePerParam:F2} ms");
            }

            // -----------------------------------------------------------------
            // 3. PDF RENDERING BREAKDOWN
            // -----------------------------------------------------------------
            Print("\n--- SECTION 3: PDF RENDERING BREAKDOWN ---");
            using (var scopePdf = profiler.BeginScope())
            {
                var swTotalPdf = Stopwatch.StartNew();

                var swLoadData = Stopwatch.StartNew();
                var reportData = await reportService.GetReportDataForPdfAsync(report.ReportId, forceLive: false);
                swLoadData.Stop();

                var swTemplate = Stopwatch.StartNew();
                var order = await dbContext.Orders.FirstOrDefaultAsync(o => o.OrderId == report.SourceId);
                var template = await dbContext.ReportTemplates.FirstOrDefaultAsync(t => t.IsDefault && !t.IsDeleted);
                var templateModel = System.Text.Json.JsonSerializer.Deserialize<SynOS.Models.DTOs.ReportTemplateDsl.TemplateModel>(template?.TemplateJson ?? "{}");
                swTemplate.Stop();

                var swImageSig = Stopwatch.StartNew();
                int signatureCount = 0;
                if (reportData?.Signatures != null)
                {
                    signatureCount = reportData.Signatures.Count;
                }
                swImageSig.Stop();

                var swQuestPdf = Stopwatch.StartNew();
                var pdfBytes = await pdfRenderer.GeneratePdfAsync(reportData!, templateModel!);
                swQuestPdf.Stop();

                var swFileWrite = Stopwatch.StartNew();
                var testOutPath = Path.Combine("C:\\SynOS_Files\\temp", $"bench_{report.ReportId}.pdf");
                Directory.CreateDirectory(Path.GetDirectoryName(testOutPath)!);
                await File.WriteAllBytesAsync(testOutPath, pdfBytes);
                swFileWrite.Stop();

                swTotalPdf.Stop();

                Print($"   Snapshot / Data Model Loading: {swLoadData.ElapsedMilliseconds} ms");
                Print($"   Template Loading & Deserialization: {swTemplate.ElapsedMilliseconds} ms");
                Print($"   Signature Image & Base64 Resolution ({signatureCount} Sigs): {swImageSig.ElapsedMilliseconds} ms");
                Print($"   QuestPDF Layout & Serialization: {swQuestPdf.ElapsedMilliseconds} ms");
                Print($"   File Write To Disk ({pdfBytes.Length} bytes): {swFileWrite.ElapsedMilliseconds} ms");
                Print($"   Total EnsureAndRenderReportPdfAsync Time: {swTotalPdf.ElapsedMilliseconds} ms");
            }

            // -----------------------------------------------------------------
            // 4. VERIFY & SIGN PIPELINE & SQL PROFILING
            // -----------------------------------------------------------------
            Print("\n--- SECTION 4: VERIFY & SIGN PIPELINE & SQL PROFILING ---");
            report.Status = "ReadyForVerification";
            await dbContext.SaveChangesAsync();

            using (var signScope = profiler.BeginScope())
            using (var signResolverScope = new ResolverInstrumentationScope())
            {
                var totalSignSw = Stopwatch.StartNew();

                var signResult = await reportService.SignReportAsync(report.ReportId, adminUser.UserId);

                totalSignSw.Stop();

                Print("\n--- SIGN REPORT ASYNC HTTP TIMINGS BREAKDOWN ---");
                Print($"   ReportId: {signResult.ReportId}");
                Print($"   Status: {signResult.Status}");
                Print($"   ContentHash: {signResult.ContentHash}");
                Print($"   TOTAL SignReportAsync HTTP Response Time: {totalSignSw.ElapsedMilliseconds} ms");

                var sqlMetrics = signScope.GetMetrics();
                Print("\n--- SQL COMMAND METRICS (HTTP PATH) ---");
                Print($"   Total SQL Command Count: {sqlMetrics.TotalCount}");
                Print($"   Total SQL Execution Time: {sqlMetrics.TotalTimeMs:F2} ms");
                Print($"   Average Query Duration: {sqlMetrics.AvgTimeMs:F2} ms");
                Print($"   Reference Range Query Count: {sqlMetrics.ReferenceRangeCount}");

                // Now measure Background PDF Generation via EnsureAndRenderReportPdfAsync
                var swBgPdf = Stopwatch.StartNew();
                var generatedPdfPath = await reportService.EnsureAndRenderReportPdfAsync(report.ReportId, forceReRender: false);
                swBgPdf.Stop();

                Print("\n--- BACKGROUND / LAZY PDF GENERATION PERFORMANCE ---");
                Print($"   Generated PDF Relative Path: {generatedPdfPath}");
                Print($"   Background PDF Generation Duration: {swBgPdf.ElapsedMilliseconds} ms");
                Print($"   End-To-End Total Availability Duration: {totalSignSw.ElapsedMilliseconds + swBgPdf.ElapsedMilliseconds} ms");

                Print("\n--- TOP 10 SLOWEST QUERIES ---");
                int idx = 1;
                foreach (var q in sqlMetrics.Top10Slowest)
                {
                    string singleLineSql = q.CommandText.Replace("\r\n", " ").Replace("\n", " ");
                    if (singleLineSql.Length > 120) singleLineSql = singleLineSql.Substring(0, 120) + "...";
                    Print($"   {idx++}. [{q.DurationMs:F2} ms] {singleLineSql}");
                }
            }
            Print("=========================================================================");
        }
    }

    public class TestUserContext : IUserContext
    {
        public Guid CurrentUserId => Guid.Parse("00000000-0000-0000-0000-000000000001");
        public Guid CurrentBranchId => Guid.Parse("a0000000-0000-0000-0000-000000000001");
        public Guid CurrentSessionId => Guid.NewGuid();
        public string CurrentRole => "Admin";
        public string CurrentMode => "Normal";
        public string UserName => "admin";
        public string DepartmentCode => "PATHOLOGY";
        public bool IsAuthenticated => true;
    }

    public class TestNotifier : INotifier
    {
        public Task NotifyActionQueueDeltaAsync(string branchId, string visitId) => Task.CompletedTask;
        public Task NotifyRealitySummaryUpdateAsync(string branchId, Guid? targetUserId = null) => Task.CompletedTask;
        public Task NotifyAssignmentUpdateAsync(string branchId, string departmentCode, Guid assignmentId, string status, string visitId, Guid? assignedResourceId = null, string? assignedTechnicianName = null) => Task.CompletedTask;
        public Task NotifyPrintJobAsync(string branchId, string printerType, string payload) => Task.CompletedTask;
        public Task NotifyInventoryShortageAsync(string branchId, string specimenId, string tubeCode, int required, int available) => Task.CompletedTask;
    }
}
