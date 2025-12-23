/*
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.ReadModels.Spend;

namespace SynOS.Services.ReadModels.Spend
{
    /// <summary>
    /// A READ-ONLY query service to create human-readable interpretations of SpendFacts.
    /// This is an interpretation layer, not a truth engine.
    /// It does not write data or modify truth in any way.
    /// </summary>
    public class SpendQueryService
    {
        private readonly SynOSDbContext _context;

        public SpendQueryService(SynOSDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Gets a list of human-readable spend records within a given date range.
        /// Joins are best-effort and will not fail if a reference is missing.
        /// </summary>
        public async Task<IEnumerable<SpendRecordView>> GetSpendRecordsAsync(DateTimeOffset from, DateTimeOffset to)
        {
            // This code will cause a compile error now that SpendFacts DbSet is removed from DbContext in SynOSDbContext
            // var spendRecords = await _context.SpendFacts
            //     .AsNoTracking()
            //     .Where(sf => sf.OccurredAt >= from && sf.OccurredAt <= to)
            //     .GroupJoin( // Left join to Suppliers
            //         _context.ImsSuppliers,
            //         spendFact => spendFact.SupplierId,
            //         supplier => supplier.SupplierId,
            //         (spendFact, suppliers) => new { spendFact, suppliers })
            //     .SelectMany(
            //         temp => temp.suppliers.DefaultIfEmpty(),
            //         (prev, supplier) => new { prev.spendFact, supplier })
            //     .GroupJoin( // Left join to Users (for Employees)
            //         _context.Users,
            //         prev => prev.spendFact.EmployeeId,
            //         user => user.UserId,
            //         (prev, users) => new { prev.spendFact, prev.supplier, users })
            //     .SelectMany(
            //         temp => temp.users.DefaultIfEmpty(),
            //         (prev, user) => new { prev.spendFact, prev.supplier, user })
            //     .OrderByDescending(x => x.spendFact.OccurredAt)
            //     .Select(x => new SpendRecordView
            //     {
            //         SpendFactId = x.spendFact.SpendFactId,
            //         Amount = x.spendFact.Amount,
            //         Currency = x.spendFact.Currency,
            //         OccurredAt = x.spendFact.OccurredAt,
            //         Channel = x.spendFact.Channel,
            //         // Best-effort name resolution
            //         CounterpartyName = x.supplier != null ? x.supplier.Name : (x.user != null ? x.user.Name : null),
            //         // Simple description generation
            //         Description = $"Paid {x.spendFact.Amount:F2} {x.spendFact.Currency} via {x.spendFact.Channel}"
            //     })
            //     .ToListAsync();

            // return spendRecords;

            // Placeholder to prevent compile errors until real implementation or removal
            return Task.FromResult<IEnumerable<SpendRecordView>>(new List<SpendRecordView>());
        }
    }
}
*/