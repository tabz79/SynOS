using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class OverviewService
    {
        private readonly MiddlewareDbContext _db;

        public OverviewService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<OverviewDto> GetAsync(string resolvedLabId, string? branchId, DateTime? date)
        {
            var targetDate = (date ?? DateTime.UtcNow).Date;

            // Today's Throughput
            var opsFact = await _db.DailyOperationsFacts.FirstOrDefaultAsync(f => 
                f.LabId == resolvedLabId && f.Date == targetDate);

            // Active Queues (Backlogs) calculated from WorkflowFacts & DeliveryFacts
            var workflowQuery = _db.WorkflowFacts.Where(w => w.LabId == resolvedLabId);
            if (!string.IsNullOrEmpty(branchId))
            {
                workflowQuery = workflowQuery.Where(w => w.BranchId == branchId);
            }

            var backlogAwaitingPayment = await workflowQuery.CountAsync(w => 
                w.VisitCreatedAt != null && w.PaymentReceivedAt == null);

            var backlogAwaitingSampleDraw = await workflowQuery.CountAsync(w => 
                w.PaymentReceivedAt != null && w.SampleCollectedAt == null);

            var backlogAwaitingProcessing = await workflowQuery.CountAsync(w => 
                w.SampleCollectedAt != null && w.ProcessingStartedAt == null);

            var backlogAwaitingVerification = await workflowQuery.CountAsync(w => 
                w.ProcessingStartedAt != null && w.ReportSignedAt == null);

            // Join with WorkflowFacts to filter by LabId/BranchId
            var deliveryQuery = _db.DeliveryFacts.AsQueryable();
            if (!string.IsNullOrEmpty(branchId))
            {
                deliveryQuery = from d in _db.DeliveryFacts
                                join w in _db.WorkflowFacts on d.PatientId equals w.PatientId
                                where w.LabId == resolvedLabId && w.BranchId == branchId
                                select d;
            }
            else
            {
                deliveryQuery = from d in _db.DeliveryFacts
                                join w in _db.WorkflowFacts on d.PatientId equals w.PatientId
                                where w.LabId == resolvedLabId
                                select d;
            }
            
            var backlogPendingDispatch = await deliveryQuery.CountAsync(d => d.Status == "Pending");

            return new OverviewDto
            {
                LabId = resolvedLabId,
                BranchId = branchId,
                Date = targetDate,
                RegistrationsToday = opsFact?.PatientsRegistered ?? 0,
                BillsCreatedToday = opsFact?.BillsCreated ?? 0,
                SamplesCollectedToday = opsFact?.SamplesCollected ?? 0,
                ReportsSignedToday = opsFact?.ReportsSigned ?? 0,
                ReportsDeliveredToday = opsFact?.ReportsDelivered ?? 0,
                RevenueCollectedToday = opsFact?.RevenueCollected ?? 0,
                PaymentsCountToday = opsFact?.PaymentsCount ?? 0,
                BacklogAwaitingPayment = backlogAwaitingPayment,
                BacklogAwaitingSampleDraw = backlogAwaitingSampleDraw,
                BacklogAwaitingProcessing = backlogAwaitingProcessing,
                BacklogAwaitingVerification = backlogAwaitingVerification,
                BacklogPendingDispatch = backlogPendingDispatch
            };
        }
    }
}
