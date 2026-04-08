using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Services.Reporting
{
    public class InterpretationService : IInterpretationService
    {
        private readonly SynOSDbContext _dbContext;

        public InterpretationService(SynOSDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task SaveOrUpdateInterpretationAsync(Guid reportId, string summary, string? notes, Guid userId)
        {
            // 1. Sign Lock: Fetch report and check status
            var report = await _dbContext.Reports
                .FirstOrDefaultAsync(r => r.ReportId == reportId);

            if (report == null)
            {
                throw new KeyNotFoundException($"Report with ID {reportId} not found.");
            }

            if (report.Status == "Signed" || report.Status == "Finalized")
            {
                throw new InvalidOperationException("Update rejected: The report has already been signed or finalized and cannot be modified.");
            }

            var now = DateTime.UtcNow;
            
            // 2. Refresh Report Timestamp for LIFO Sorting
            report.UpdatedAt = now;

            // 3. Upsert Logic
            var existing = await _dbContext.ReportInterpretations
                .FirstOrDefaultAsync(ri => ri.ReportId == reportId);

            if (existing != null)
            {
                // Update existing record
                existing.Summary = summary;
                existing.Notes = notes;
                existing.UpdatedAt = now;
                // Note: CreatedBy and CreatedAt are preserved
            }
            else
            {
                // Create new record
                var newInterpretation = new ReportInterpretation
                {
                    Id = Guid.NewGuid(),
                    ReportId = reportId,
                    Summary = summary,
                    Notes = notes,
                    CreatedBy = userId,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _dbContext.ReportInterpretations.Add(newInterpretation);
            }

            await _dbContext.SaveChangesAsync();
        }

        public async Task<ReportInterpretation?> GetInterpretationAsync(Guid reportId)
        {
            return await _dbContext.ReportInterpretations
                .AsNoTracking()
                .FirstOrDefaultAsync(ri => ri.ReportId == reportId);
        }
    }
}
