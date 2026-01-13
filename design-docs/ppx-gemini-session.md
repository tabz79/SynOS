✦ I will begin by searching for existing Intelligence layer contracts to ensure the adapters align with their expected inputs.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  FindFiles 'src/SynOS.Services/*Intelligence*/**'                                                                                                        │
│                                                                                                                                                            │
│ Found 5 matching file(s)                                                                                                                                   │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will read the interfaces for both Intelligence services to identify their data consumption requirements.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile IEconomicsIntelligenceService.cs                                                                                                               │
│                                                                                                                                                            │
│                                                                                                                                                            │
│ ✓  ReadFile ...\IBusinessIntelligenceService.cs                                                                                                            │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will now examine the implementations of both Intelligence services to understand how they currently access facts from the truth engines.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile ...\EconomicsIntelligenceService.cs                                                                                                            │
│                                                                                                                                                            │
│                                                                                                                                                            │
│ ✓  ReadFile ...\BusinessIntelligenceService.cs                                                                                                             │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will now check the properties of the StatutoryObligationFact entity to ensure the adapter provides the correct data structure.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile src\...\StatutoryObligationFact.cs                                                                                                             │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will now check for any existing Interpretation DTOs that can be reused for the Intelligence Wiring adapters.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFolder src/SynOS.Servic...terpretation/Dto                                                                                                          │
│                                                                                                                                                            │
│ Listed 1 item(s).                                                                                                                                          │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will now implement the HRMS Intelligence Wiring adapters, starting with the necessary DTOs and the directory structure.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Shell mkdir src\SynOS.Services\HRMS\IntelligenceWiring; mkdir src\SynOS.Models\DTOs\HRMS\IntelligenceWiring [current working directory D:\Projects\Syn… │
│                                                                                                                                                            │
│                                                                                                                                                            │
│                                                                                                                                                            │
│     Directory: D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\HRMS                                                                      │
│                                                                                                                                                            │
│                                                                                                                                                            │
│ Mode                 LastWriteTime         Length Name                                                                                                     │
│ ----                 -------------         ------ ----                                                                                                     │
│ d-----        13-01-2026  01:40 PM                IntelligenceWiring                                                                                       │
│                                                                                                                                                            │
│                                                                                                                                                            │
│     Directory: D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Models\DTOs\HRMS                                                                   │
│                                                                                                                                                            │
│                                                                                                                                                            │
│ Mode                 LastWriteTime         Length Name                                                                                                     │
│ ----                 -------------         ------ ----                                                                                                     │
│ d-----        13-01-2026  01:40 PM                IntelligenceWiring                                                                                       │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will now create the DTOs for the HRMS Intelligence Wiring adapters to facilitate data exchange with the Intelligence layers.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to src\...\IntelligenceWiringDtos.cs                                                                                                  │
│                                                                                                                                                            │
│  1 using System;                                                                                                                                           │
│  2                                                                                                                                                         │
│  3 namespace SynOS.Models.DTOs.HRMS.IntelligenceWiring                                                                                                     │
│  4 {                                                                                                                                                       │
│  5     /// <summary>                                                                                                                                       │
│  6     /// Flat projection of a Payroll Fact for Economic Intelligence consumption.                                                                        │
│  7     /// Represents the base labor cost (accrual basis).                                                                                                 │
│  8     /// </summary>                                                                                                                                      │
│  9     public class PayrollCostFact                                                                                                                        │
│ 10     {                                                                                                                                                   │
│ 11         public Guid PayrollRunId { get; set; }                                                                                                          │
│ 12         public Guid EmployeeId { get; set; }                                                                                                            │
│ 13         public string Department { get; set; } = string.Empty;                                                                                          │
│ 14         public string PayComponentName { get; set; } = string.Empty;                                                                                    │
│ 15         public decimal Amount { get; set; }                                                                                                             │
│ 16         public string Currency { get; set; } = "INR";                                                                                                   │
│ 17         public DateTime PeriodStart { get; set; }                                                                                                       │
│ 18         public DateTime PeriodEnd { get; set; }                                                                                                         │
│ 19     }                                                                                                                                                   │
│ 20                                                                                                                                                         │
│ 21     /// <summary>                                                                                                                                       │
│ 22     /// Flat projection of a Statutory Obligation for Economic Intelligence consumption.                                                                │
│ 23     /// Represents the non-salary labor burden (employer share).                                                                                        │
│ 24     /// </summary>                                                                                                                                      │
│ 25     public class StatutoryBurdenFact                                                                                                                    │
│ 26     {                                                                                                                                                   │
│ 27         public Guid StatutoryObligationFactId { get; set; }                                                                                             │
│ 28         public string Authority { get; set; } = string.Empty;                                                                                           │
│ 29         public string ObligationType { get; set; } = string.Empty;                                                                                      │
│ 30         public decimal Amount { get; set; }                                                                                                             │
│ 31         public string Currency { get; set; } = string.Empty;                                                                                            │
│ 32         public DateTime LegalPeriodStart { get; set; }                                                                                                  │
│ 33         public DateTime LegalPeriodEnd { get; set; }                                                                                                    │
│ 34     }                                                                                                                                                   │
│ 35                                                                                                                                                         │
│ 36     /// <summary>                                                                                                                                       │
│ 37     /// Flat projection of labor-related Spend facts for Business Intelligence consumption.                                                             │
│ 38     /// Represents actual cash outflow.                                                                                                                 │
│ 39     /// </summary>                                                                                                                                      │
│ 40     public class LaborDisbursementFact                                                                                                                  │
│ 41     {                                                                                                                                                   │
│ 42         public Guid SpendFactId { get; set; }                                                                                                           │
│ 43         public Guid PayeeId { get; set; }                                                                                                               │
│ 44         public decimal Amount { get; set; }                                                                                                             │
│ 45         public string Currency { get; set; } = string.Empty;                                                                                            │
│ 46         public string Channel { get; set; } = string.Empty; // e.g. "Salary Payable"                                                                    │
│ 47         public DateTime OccurredAt { get; set; }                                                                                                        │
│ 48         public string TransactionReference { get; set; } = string.Empty;                                                                                │
│ 49     }                                                                                                                                                   │
│ 50 }                                                                                                                                                       │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will now create the IHrmsEconomicIntelligenceAdapter interface, which defines the contract for exposing labor cost and statutory burden facts.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to IHrmsEconomicIntelligenceAdapter.cs                                                                                                │
│                                                                                                                                                            │
│  1 using System;                                                                                                                                           │
│  2 using System.Collections.Generic;                                                                                                                       │
│  3 using System.Threading.Tasks;                                                                                                                           │
│  4 using SynOS.Models.DTOs.HRMS.IntelligenceWiring;                                                                                                        │
│  5                                                                                                                                                         │
│  6 namespace SynOS.Services.HRMS.IntelligenceWiring                                                                                                        │
│  7 {                                                                                                                                                       │
│  8     /// <summary>                                                                                                                                       │
│  9     /// Provides read-only access to labor cost facts for the Economic Intelligence layer.                                                              │
│ 10     /// Focuses on accrual-based liability.                                                                                                             │
│ 11     /// </summary>                                                                                                                                      │
│ 12     public interface IHrmsEconomicIntelligenceAdapter                                                                                                   │
│ 13     {                                                                                                                                                   │
│ 14         Task<List<PayrollCostFact>> GetPayrollCostFactsAsync(DateTime from, DateTime to);                                                               │
│ 15         Task<List<StatutoryBurdenFact>> GetStatutoryBurdenFactsAsync(DateTime from, DateTime to);                                                       │
│ 16     }                                                                                                                                                   │
│ 17 }                                                                                                                                                       │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will now create the IHrmsBusinessIntelligenceAdapter interface, which defines the contract for exposing labor-related cash disbursement facts to the      
  Business Intelligence layer.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to IHrmsBusinessIntelligenceAdapter.cs                                                                                                │
│                                                                                                                                                            │
│  1 using System;                                                                                                                                           │
│  2 using System.Collections.Generic;                                                                                                                       │
│  3 using System.Threading.Tasks;                                                                                                                           │
│  4 using SynOS.Models.DTOs.HRMS.IntelligenceWiring;                                                                                                        │
│  5                                                                                                                                                         │
│  6 namespace SynOS.Services.HRMS.IntelligenceWiring                                                                                                        │
│  7 {                                                                                                                                                       │
│  8     /// <summary>                                                                                                                                       │
│  9     /// Provides read-only access to labor disbursement facts for the Business Intelligence layer.                                                      │
│ 10     /// Focuses on cash outflow and liquidity impact.                                                                                                   │
│ 11     /// </summary>                                                                                                                                      │
│ 12     public interface IHrmsBusinessIntelligenceAdapter                                                                                                   │
│ 13     {                                                                                                                                                   │
│ 14         Task<List<LaborDisbursementFact>> GetLaborDisbursementFactsAsync(DateTime from, DateTime to);                                                   │
│ 15     }                                                                                                                                                   │
│ 16 }                                                                                                                                                       │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will now implement the HrmsEconomicIntelligenceAdapter, which retrieves payroll cost facts and statutory burden facts by joining relevant truth engine    
  tables.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to HrmsEconomicIntelligenceAdapter.cs                                                                                                 │
│                                                                                                                                                            │
│  1 using System;                                                                                                                                           │
│  2 using System.Collections.Generic;                                                                                                                       │
│  3 using System.Linq;                                                                                                                                      │
│  4 using System.Threading.Tasks;                                                                                                                           │
│  5 using Microsoft.EntityFrameworkCore;                                                                                                                    │
│  6 using SynOS.Data;                                                                                                                                       │
│  7 using SynOS.Models.DTOs.HRMS.IntelligenceWiring;                                                                                                        │
│  8                                                                                                                                                         │
│  9 namespace SynOS.Services.HRMS.IntelligenceWiring                                                                                                        │
│ 10 {                                                                                                                                                       │
│ 11     public class HrmsEconomicIntelligenceAdapter : IHrmsEconomicIntelligenceAdapter                                                                     │
│ 12     {                                                                                                                                                   │
│ 13         private readonly SynOSDbContext _context;                                                                                                       │
│ 14                                                                                                                                                         │
│ 15         public HrmsEconomicIntelligenceAdapter(SynOSDbContext context)                                                                                  │
│ 16         {                                                                                                                                               │
│ 17             _context = context;                                                                                                                         │
│ 18         }                                                                                                                                               │
│ 19                                                                                                                                                         │
│ 20         public async Task<List<PayrollCostFact>> GetPayrollCostFactsAsync(DateTime from, DateTime to)                                                   │
│ 21         {                                                                                                                                               │
│ 22             // Mechanical join only: Fact -> Component -> Run -> Period                                                                                 │
│ 23             return await _context.PayrollFacts.AsNoTracking()                                                                                           │
│ 24                 .Join(_context.PayrollRuns, f => f.PayrollRunId, r => r.PayrollRunId, (f, r) => new { f, r })                                           │
│ 25                 .Join(_context.PayrollPeriods, x => x.r.PayrollPeriodId, p => p.PayrollPeriodId, (x, p) => new { x.f, x.r, p })                         │
│ 26                 .Join(_context.PayComponents, y => y.f.PayComponentId, c => c.PayComponentId, (y, c) => new { y.f, y.r, y.p, c })                       │
│ 27                 .Join(_context.Employees, z => z.f.EmployeeId, e => e.EmployeeId, (z, e) => new { z.f, z.r, z.p, z.c, e })                              │
│ 28                 .Where(a => a.p.StartDate >= from && a.p.EndDate <= to)                                                                                 │
│ 29                 .Select(s => new PayrollCostFact                                                                                                        │
│ 30                 {                                                                                                                                       │
│ 31                     PayrollRunId = s.f.PayrollRunId,                                                                                                    │
│ 32                     EmployeeId = s.f.EmployeeId,                                                                                                        │
│ 33                     Department = s.e.Department, // Explicit fact attribute from HR Master                                                              │
│ 34                     PayComponentName = s.c.Name ?? "Unknown",                                                                                           │
│ 35                     Amount = s.f.Amount,                                                                                                                │
│ 36                     Currency = "INR", // Default system currency                                                                                        │
│ 37                     PeriodStart = s.p.StartDate,                                                                                                        │
│ 38                     PeriodEnd = s.p.EndDate                                                                                                             │
│ 39                 })                                                                                                                                      │
│ 40                 .ToListAsync();                                                                                                                         │
│ 41         }                                                                                                                                               │
│ 42                                                                                                                                                         │
│ 43         public async Task<List<StatutoryBurdenFact>> GetStatutoryBurdenFactsAsync(DateTime from, DateTime to)                                           │
│ 44         {                                                                                                                                               │
│ 45             return await _context.StatutoryObligationFacts.AsNoTracking()                                                                               │
│ 46                 .Where(f => f.LegalPeriodStart >= from && f.LegalPeriodEnd <= to)                                                                       │
│ 47                 .Select(s => new StatutoryBurdenFact                                                                                                    │
│ 48                 {                                                                                                                                       │
│ 49                     StatutoryObligationFactId = s.StatutoryObligationFactId,                                                                            │
│ 50                     Authority = s.AuthorityType.ToString(),                                                                                             │
│ 51                     ObligationType = s.ObligationType.ToString(),                                                                                       │
│ 52                     Amount = s.Amount,                                                                                                                  │
│ 53                     Currency = s.Currency,                                                                                                              │
│ 54                     LegalPeriodStart = s.LegalPeriodStart,                                                                                              │
│ 55                     LegalPeriodEnd = s.LegalPeriodEnd                                                                                                   │
│ 56                 })                                                                                                                                      │
│ 57                 .ToListAsync();                                                                                                                         │
│ 58         }                                                                                                                                               │
│ 59     }                                                                                                                                                   │
│ 60 }                                                                                                                                                       │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will now implement the HrmsBusinessIntelligenceAdapter, which filters SpendFacts for labor-related disbursements, including salaries, commissions, and    
  statutory payments.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to HrmsBusinessIntelligenceAdapter.cs                                                                                                 │
│                                                                                                                                                            │
│  1 using System;                                                                                                                                           │
│  2 using System.Collections.Generic;                                                                                                                       │
│  3 using System.Linq;                                                                                                                                      │
│  4 using System.Threading.Tasks;                                                                                                                           │
│  5 using Microsoft.EntityFrameworkCore;                                                                                                                    │
│  6 using SynOS.Data;                                                                                                                                       │
│  7 using SynOS.Models.DTOs.HRMS.IntelligenceWiring;                                                                                                        │
│  8                                                                                                                                                         │
│  9 namespace SynOS.Services.HRMS.IntelligenceWiring                                                                                                        │
│ 10 {                                                                                                                                                       │
│ 11     public class HrmsBusinessIntelligenceAdapter : IHrmsBusinessIntelligenceAdapter                                                                     │
│ 12     {                                                                                                                                                   │
│ 13         private readonly SynOSDbContext _context;                                                                                                       │
│ 14                                                                                                                                                         │
│ 15         public HrmsBusinessIntelligenceAdapter(SynOSDbContext context)                                                                                  │
│ 16         {                                                                                                                                               │
│ 17             _context = context;                                                                                                                         │
│ 18         }                                                                                                                                               │
│ 19                                                                                                                                                         │
│ 20         public async Task<List<LaborDisbursementFact>> GetLaborDisbursementFactsAsync(DateTime from, DateTime to)                                       │
│ 21         {                                                                                                                                               │
│ 22             // Filter by labor-related channels as defined in Spend Engine PRD                                                                          │
│ 23             string[] laborChannels = { "Salary Payable", "Referral / Commission Payable", "Taxes & Statutory Payable" };                                │
│ 24                                                                                                                                                         │
│ 25             return await _context.SpendFacts.AsNoTracking()                                                                                             │
│ 26                 .Where(s => s.OccurredAt >= from && s.OccurredAt <= to && laborChannels.Contains(s.Channel))                                            │
│ 27                 .Select(s => new LaborDisbursementFact                                                                                                  │
│ 28                 {                                                                                                                                       │
│ 29                     SpendFactId = s.SpendFactId,                                                                                                        │
│ 30                     PayeeId = s.PayeeId,                                                                                                                │
│ 31                     Amount = s.Amount,                                                                                                                  │
│ 32                     Currency = s.Currency,                                                                                                              │
│ 33                     Channel = s.Channel,                                                                                                                │
│ 34                     OccurredAt = s.OccurredAt,                                                                                                          │
│ 35                     TransactionReference = s.TransactionReference                                                                                       │
│ 36                 })                                                                                                                                      │
│ 37                 .ToListAsync();                                                                                                                         │
│ 38         }                                                                                                                                               │
│ 39     }                                                                                                                                                   │
│ 40 }                                                                                                                                                       │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will now create the HrmsIntelligenceWiringServiceCollectionExtensions to register the new adapters in the dependency injection container.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  WriteFile Writing to src\SynOS.Servic...ionExtensions.cs                                                                                                │
│                                                                                                                                                            │
│  1 using Microsoft.Extensions.DependencyInjection;                                                                                                         │
│  2                                                                                                                                                         │
│  3 namespace SynOS.Services.HRMS.IntelligenceWiring                                                                                                        │
│  4 {                                                                                                                                                       │
│  5     public static class HrmsIntelligenceWiringServiceCollectionExtensions                                                                               │
│  6     {                                                                                                                                                   │
│  7         public static IServiceCollection AddHrmsIntelligenceWiring(this IServiceCollection services)                                                    │
│  8         {                                                                                                                                               │
│  9             services.AddScoped<IHrmsEconomicIntelligenceAdapter, HrmsEconomicIntelligenceAdapter>();                                                    │
│ 10             services.AddScoped<IHrmsBusinessIntelligenceAdapter, HrmsBusinessIntelligenceAdapter>();                                                    │
│ 11             return services;                                                                                                                            │
│ 12         }                                                                                                                                               │
│ 13     }                                                                                                                                                   │
│ 14 }                                                                                                                                                       │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will now update Program.cs to include the registration of the HRMS Intelligence Wiring services.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit src\SynOS.Api\Program.cs: using SynOS.Services.Complianc... => using SynOS.Services.Complianc...                                                   │
│                                                                                                                                                            │
│ 32   using SynOS.Services.Governance; // ADDED                                                                                                             │
│ 33   using SynOS.Services.Compliance; // ADDED                                                                                                             │
│ 34   using SynOS.Services.HRMS.Interpretation; // ADDED                                                                                                    │
│ 35 + using SynOS.Services.HRMS.IntelligenceWiring; // ADDED                                                                                                │
│ 36                                                                                                                                                         │
│ 37   var builder = WebApplication.CreateBuilder(args);                                                                                                     │
│ 38                                                                                                                                                         │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will now add the call to AddHrmsIntelligenceWiring in Program.cs to ensure the adapters are available for use.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit src\SynOS.Api\Program.cs: builder.Services.AddGovernance... => builder.Services.AddGovernance...                                                   │
│                                                                                                                                                            │
│ 163   builder.Services.AddComplianceServices(); // ADDED                                                                                                   │
│ 164   builder.Services.AddGovernanceServices(); // ADDED                                                                                                   │
│ 165   builder.Services.AddHrmsInterpretation(); // ADDED                                                                                                   │
│ 166 + builder.Services.AddHrmsIntelligenceWiring(); // ADDED                                                                                               │
│ 167                                                                                                                                                        │
│ 168   // Register Economics Intelligence services (OPT-IN)                                                                                                 │
│ 169   // builder.Services.AddEconomicsIntelligence();                                                                                                      │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will now run dotnet build to verify that the implementation is correct and there are no compilation errors.

╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Shell dotnet build [current working directory D:\Projects\SynOS-Synthesized-Lab-Intelligence] (Verifying HRMS Intelligence Wiring implementation.)      │
│                                                                                                                                                            │
│ ... first 58 lines hidden ...                                                                                                                              │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(343,38): warning CS8601: Possible null reference assi                │
│ gnment. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(344,43): warning CS8601: Possible null reference assi                │
│ gnment. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(345,37): warning CS8601: Possible null reference assi                │
│ gnment. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\PacsService.cs(416,59): warning CS8602: Dereference of a possibly null re                │
│ ference. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                         │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(396,48): warning CS8601: Possible null reference assi                │
│ gnment. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(496,28): warning CS8601: Possible null reference assi                │
│ gnment. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(497,34): warning CS8601: Possible null reference assi                │
│ gnment. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(498,35): warning CS8601: Possible null reference assi                │
│ gnment. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(502,35): warning CS8601: Possible null reference assi                │
│ gnment. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(517,21): warning CS8600: Converting null literal or p                │
│ ossible null value to non-nullable type. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                         │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\RadiologyService.cs(524,79): warning CS8604: Possible null reference argu                │
│ ment for parameter 'templateModel' in 'Task<byte[]> IReportPdfRenderer.GeneratePdfAsync(ReportDataModel data, TemplateModel templateModel)'                │
│ . [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                                                │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\AuditService.cs(46,38): warning CA2017: Number of parameters supplied in                 │
│ the logging message template do not match the number of named placeholders (https://learn.microsoft.com/dotnet/fundamentals/code-analysis/q                │
│ uality-rules/ca2017) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Services\SynOS.Services.csproj]                                             │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Admin\CsvImportRequestDto.cs(9,26): warning CS8618: Non-nullable p                │
│ roperty 'File' must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring the property as                │
│  nullable. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                 │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(20,100): warning CS8602: Dereference of a possibly null refe                │
│ rence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                     │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(51,85): warning CS8602: Dereference of a possibly null refer                │
│ ence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                      │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(52,77): warning CS8602: Dereference of a possibly null refer                │
│ ence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                      │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(53,79): warning CS8602: Dereference of a possibly null refer                │
│ ence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                      │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(54,84): warning CS8602: Dereference of a possibly null refer                │
│ ence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                      │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(83,73): warning CS8602: Dereference of a possibly null refer                │
│ ence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                      │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\MappingProfile.cs(83,73): warning CS8602: Dereference of a possibly null refer                │
│ ence. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                                      │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\IMSStockOperationController.cs(27,37): warning CS8604: Possible nu                │
│ ll reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.A                │
│ pi\SynOS.Api.csproj]                                                                                                                                       │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\IMSStockOperationController.cs(36,37): warning CS8604: Possible nu                │
│ ll reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.A                │
│ pi\SynOS.Api.csproj]                                                                                                                                       │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\IMSPurchasingController.cs(127,41): warning CS8604: Possible null                 │
│ reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\                │
│ SynOS.Api.csproj]                                                                                                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyController.cs(30,37): warning CS8604: Possible null refer                │
│ ence argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS                │
│ .Api.csproj]                                                                                                                                               │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\IMSWastageController.cs(42,110): warning CS8629: Nullable value ty                │
│ pe may be null. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                                            │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyController.cs(47,37): warning CS8604: Possible null refer                │
│ ence argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS                │
│ .Api.csproj]                                                                                                                                               │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyReportsController.cs(40,37): warning CS8604: Possible nul                │
│ l reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Ap                │
│ i\SynOS.Api.csproj]                                                                                                                                        │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyReportsController.cs(48,37): warning CS8604: Possible nul                │
│ l reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Ap                │
│ i\SynOS.Api.csproj]                                                                                                                                        │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyController.cs(61,37): warning CS8604: Possible null refer                │
│ ence argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS                │
│ .Api.csproj]                                                                                                                                               │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyController.cs(92,37): warning CS8604: Possible null refer                │
│ ence argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS                │
│ .Api.csproj]                                                                                                                                               │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsController.cs(32,37): warning CS8604: Possible null                 │
│ reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\                │
│ SynOS.Api.csproj]                                                                                                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\RadiologyController.cs(101,37): warning CS8604: Possible null refe                │
│ rence argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynO                │
│ S.Api.csproj]                                                                                                                                              │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsController.cs(45,37): warning CS8604: Possible null                 │
│ reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\                │
│ SynOS.Api.csproj]                                                                                                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsController.cs(59,37): warning CS8604: Possible null                 │
│ reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\                │
│ SynOS.Api.csproj]                                                                                                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsController.cs(68,37): warning CS8604: Possible null                 │
│ reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\                │
│ SynOS.Api.csproj]                                                                                                                                          │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsAdminController.cs(25,37): warning CS8604: Possible                 │
│ null reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS                │
│ .Api\SynOS.Api.csproj]                                                                                                                                     │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsAdminController.cs(33,37): warning CS8604: Possible                 │
│ null reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS                │
│ .Api\SynOS.Api.csproj]                                                                                                                                     │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\Radiology\PacsAdminController.cs(41,37): warning CS8604: Possible                 │
│ null reference argument for parameter 'input' in 'Guid Guid.Parse(string input)'. [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS                │
│ .Api\SynOS.Api.csproj]                                                                                                                                     │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\SecureDownloadController.cs(61,13): warning ASP0019: Use IHeaderDi                │
│ ctionary.Append or the indexer to append or set headers. IDictionary.Add will throw an ArgumentException when attempting to add a duplicate                │
│  key. (https://aka.ms/aspnet/analyzers) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                    │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\SecureDownloadController.cs(62,13): warning ASP0019: Use IHeaderDi                │
│ ctionary.Append or the indexer to append or set headers. IDictionary.Add will throw an ArgumentException when attempting to add a duplicate                │
│  key. (https://aka.ms/aspnet/analyzers) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                    │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\SecureDownloadController.cs(63,13): warning ASP0019: Use IHeaderDi                │
│ ctionary.Append or the indexer to append or set headers. IDictionary.Add will throw an ArgumentException when attempting to add a duplicate                │
│  key. (https://aka.ms/aspnet/analyzers) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                    │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\SecureDownloadController.cs(94,13): warning ASP0019: Use IHeaderDi                │
│ ctionary.Append or the indexer to append or set headers. IDictionary.Add will throw an ArgumentException when attempting to add a duplicate                │
│  key. (https://aka.ms/aspnet/analyzers) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                    │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\SecureDownloadController.cs(95,13): warning ASP0019: Use IHeaderDi                │
│ ctionary.Append or the indexer to append or set headers. IDictionary.Add will throw an ArgumentException when attempting to add a duplicate                │
│  key. (https://aka.ms/aspnet/analyzers) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                    │
│ D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\Controllers\SecureDownloadController.cs(96,13): warning ASP0019: Use IHeaderDi                │
│ ctionary.Append or the indexer to append or set headers. IDictionary.Add will throw an ArgumentException when attempting to add a duplicate                │
│  key. (https://aka.ms/aspnet/analyzers) [D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api\SynOS.Api.csproj]                                   │
│     436 Warning(s)                                                                                                                                         │
│     0 Error(s)                                                                                                                                             │
│                                                                                                                                                            │
│ Time Elapsed 00:01:10.43                                                                                                                                   │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ The HRMS Intelligence Wiring layer is successfully implemented and verified. I have created the HrmsEconomicIntelligenceAdapter and
  HrmsBusinessIntelligenceAdapter to expose read-only labor cost and disbursement facts to the respective intelligence layers, ensuring strict adherence to   
  the truth engine architecture and your specific constraints.

  Key Implementation Details:
   - `IHrmsEconomicIntelligenceAdapter`: Exposes PayrollFacts and StatutoryObligationFacts joined with HR and period context for accrual-based analysis.      
   - `IHrmsBusinessIntelligenceAdapter`: Provides labor-related SpendFacts (Salary, Commissions, Taxes) for cash-flow and liquidity impact views.
   - DTOs: Specific communication models (PayrollCostFact, StatutoryBurdenFact, LaborDisbursementFact) were introduced to maintain a clean boundary without   
     creating new "intelligence schemas."
   - Read-Only Purity: All queries utilize AsNoTracking() and perform only mechanical grouping by period or explicit fact attributes.

  The build succeeded with no errors, and the adapters are registered in the dependency injection container via Program.cs. I am standing by for your next    
  instruction.