using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.HRMS.IntelligenceWiring;

namespace SynOS.Services.HRMS.IntelligenceWiring
{
    public class HrmsEconomicIntelligenceAdapter : IHrmsEconomicIntelligenceAdapter
    {
        private readonly SynOSDbContext _context;

        public HrmsEconomicIntelligenceAdapter(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<List<PayrollCostFact>> GetPayrollCostFactsAsync(DateTime from, DateTime to)
        {
            // Mechanical join only: Fact -> Component -> Run -> Period
            return await _context.PayrollFacts.AsNoTracking()
                .Join(_context.PayrollRuns, f => f.PayrollRunId, r => r.PayrollRunId, (f, r) => new { f, r })
                .Join(_context.PayrollPeriods, x => x.r.PayrollPeriodId, p => p.PayrollPeriodId, (x, p) => new { x.f, x.r, p })
                .Join(_context.PayComponents, y => y.f.PayComponentId, c => c.PayComponentId, (y, c) => new { y.f, y.r, y.p, c })
                .Join(_context.Employees, z => z.f.EmployeeId, e => e.EmployeeId, (z, e) => new { z.f, z.r, z.p, z.c, e })
                .Where(a => a.p.StartDate >= from && a.p.EndDate <= to)
                .Select(s => new PayrollCostFact
                {
                    PayrollRunId = s.f.PayrollRunId,
                    EmployeeId = s.f.EmployeeId,
                    Department = s.e.Department, // Explicit fact attribute from HR Master
                    PayComponentName = s.c.Name ?? "Unknown",
                    Amount = s.f.Amount,
                    Currency = "INR", // Default system currency
                    PeriodStart = s.p.StartDate,
                    PeriodEnd = s.p.EndDate
                })
                .ToListAsync();
        }

        public async Task<List<StatutoryBurdenFact>> GetStatutoryBurdenFactsAsync(DateTime from, DateTime to)
        {
            return await _context.StatutoryObligationFacts.AsNoTracking()
                .Where(f => f.LegalPeriodStart >= from && f.LegalPeriodEnd <= to)
                .Select(s => new StatutoryBurdenFact
                {
                    StatutoryObligationFactId = s.StatutoryObligationFactId,
                    Authority = s.AuthorityType.ToString(),
                    ObligationType = s.ObligationType.ToString(),
                    Amount = s.Amount,
                    Currency = s.Currency,
                    LegalPeriodStart = s.LegalPeriodStart,
                    LegalPeriodEnd = s.LegalPeriodEnd
                })
                .ToListAsync();
        }
    }
}
