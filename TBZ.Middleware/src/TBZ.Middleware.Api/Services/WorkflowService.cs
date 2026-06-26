using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class WorkflowService
    {
        private readonly MiddlewareDbContext _db;

        public WorkflowService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<WorkflowTatDto> GetAsync(string resolvedLabId, string? branchId, DateTime? startDate, DateTime? endDate)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var query = _db.WorkflowFacts.Where(w => 
                w.LabId == resolvedLabId && 
                w.VisitCreatedAt >= start && 
                w.VisitCreatedAt <= end);

            if (!string.IsNullOrEmpty(branchId))
            {
                query = query.Where(w => w.BranchId == branchId);
            }

            var factsList = await query.ToListAsync();

            // Compute averages in memory
            double ComputeAvgMinutes(Func<Domain.WorkflowFact, double?> diffSelector)
            {
                var values = factsList.Select(diffSelector).Where(v => v.HasValue).Select(v => v!.Value).ToList();
                return values.Count > 0 ? Math.Round(values.Average(), 2) : 0;
            }

            var avgRegToCheckout = ComputeAvgMinutes(f => 
                (f.PaymentReceivedAt.HasValue && f.VisitCreatedAt.HasValue) 
                    ? (f.PaymentReceivedAt.Value - f.VisitCreatedAt.Value).TotalMinutes 
                    : (double?)null);

            var avgCheckoutToDraw = ComputeAvgMinutes(f => 
                (f.SampleCollectedAt.HasValue && f.PaymentReceivedAt.HasValue) 
                    ? (f.SampleCollectedAt.Value - f.PaymentReceivedAt.Value).TotalMinutes 
                    : (double?)null);

            var avgDrawToProc = ComputeAvgMinutes(f => 
                (f.ProcessingStartedAt.HasValue && f.SampleCollectedAt.HasValue) 
                    ? (f.ProcessingStartedAt.Value - f.SampleCollectedAt.Value).TotalMinutes 
                    : (double?)null);

            var avgProcToSign = ComputeAvgMinutes(f => 
                (f.ReportSignedAt.HasValue && f.ProcessingStartedAt.HasValue) 
                    ? (f.ReportSignedAt.Value - f.ProcessingStartedAt.Value).TotalMinutes 
                    : (double?)null);

            var avgSignToDeliv = ComputeAvgMinutes(f => 
                (f.ReportDeliveredAt.HasValue && f.ReportSignedAt.HasValue) 
                    ? (f.ReportDeliveredAt.Value - f.ReportSignedAt.Value).TotalMinutes 
                    : (double?)null);

            var avgOverall = ComputeAvgMinutes(f => 
                (f.ReportDeliveredAt.HasValue && f.VisitCreatedAt.HasValue) 
                    ? (f.ReportDeliveredAt.Value - f.VisitCreatedAt.Value).TotalMinutes 
                    : (double?)null);

            var completedCount = factsList.Count(f => f.ReportSignedAt.HasValue);

            return new WorkflowTatDto
            {
                LabId = resolvedLabId,
                BranchId = branchId,
                AvgRegistrationToCheckoutMinutes = avgRegToCheckout,
                AvgCheckoutToSampleDrawMinutes = avgCheckoutToDraw,
                AvgSampleDrawToProcessingMinutes = avgDrawToProc,
                AvgProcessingToReportSignedMinutes = avgProcToSign,
                AvgReportSignedToReportDeliveredMinutes = avgSignToDeliv,
                AvgOverallTurnaroundTimeMinutes = avgOverall,
                TotalCompletedVisitsCount = completedCount
            };
        }
    }
}
