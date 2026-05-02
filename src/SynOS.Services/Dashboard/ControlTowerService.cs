using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Dashboard.ControlTower;
using SynOS.Models.Entities;
using SynOS.Models.Enums;

namespace SynOS.Services.Dashboard
{
    public class ControlTowerService : IControlTowerService
    {
        private readonly SynOSDbContext _context;

        public ControlTowerService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<ControlTowerSummaryDto> GetFullDashboardAsync(Guid branchId)
        {
            // We execute these sequentially on the same context to respect "do not create excessive DB connections"
            // and maintain EF Core thread safety.
            return new ControlTowerSummaryDto
            {
                Reception = await GetReceptionCardAsync(branchId),
                Phlebotomy = await GetPhlebotomyCardAsync(branchId),
                LabWorkbench = await GetWorkbenchCardAsync(branchId),
                ReportsTyping = await GetTypistCardAsync(branchId),
                Pathologist = await GetPathologistCardAsync(branchId),
                Delivery = await GetDeliveryCardAsync(branchId),
                Financials = await GetFinancialsAsync(branchId)
            };
        }

        private async Task<ControlTowerCardDto> GetReceptionCardAsync(Guid branchId)
        {
            var today = DateTime.Today;
            var query = _context.Visits
                .AsNoTracking()
                .Where(v => v.BranchId == branchId && v.TokenDate.Date == today)
                .Where(v => v.Status == VisitStatus.Draft || v.Status == VisitStatus.PendingPayment);

            var count = await query.CountAsync();
            var items = await query
                .OrderBy(v => v.CreatedAt)
                .Take(3)
                .Select(v => new ControlTowerItemDto
                {
                    Id = v.VisitId,
                    Name = v.Patient != null ? $"{v.Patient.FirstName} {v.Patient.LastName}" : "Unknown",
                    Detail = GetWaitTime(v.CreatedAt),
                    StatusBadge = v.Status.ToString()
                })
                .ToListAsync();

            return new ControlTowerCardDto
            {
                Count = count,
                PrimaryText = $"{count} patients waiting",
                Status = count > 5 ? "Needs Attention" : "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetPhlebotomyCardAsync(Guid branchId)
        {
            var query = _context.Specimens
                .AsNoTracking()
                .Where(s => s.Visit != null && s.Visit.BranchId == branchId && s.Status == SpecimenStatus.Pending);

            var count = await query.CountAsync();
            var items = await query
                .OrderBy(s => s.CreatedAt)
                .Take(3)
                .Select(s => new ControlTowerItemDto
                {
                    Id = s.SpecimenId,
                    Name = s.Visit != null && s.Visit.Patient != null ? $"{s.Visit.Patient.FirstName} {s.Visit.Patient.LastName}" : "Unknown",
                    Detail = s.CreatedAt.ToString("hh:mm tt"),
                    StatusBadge = "Pending"
                })
                .ToListAsync();

            return new ControlTowerCardDto
            {
                Count = count,
                PrimaryText = $"{count} pending collections",
                Status = count > 3 ? "Needs Attention" : "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetWorkbenchCardAsync(Guid branchId)
        {
            // Workbench = Results in Processing
            var query = _context.Results
                .AsNoTracking()
                .Where(r => r.Order != null && r.Order.Visit != null && r.Order.Visit.BranchId == branchId && r.Status == "Processing");

            var count = await query.CountAsync();
            var items = await query
                .OrderBy(r => r.EnteredAt)
                .Take(3)
                .Select(r => new ControlTowerItemDto
                {
                    Id = r.ResultId,
                    Name = r.ParameterCode ?? "Unknown Test",
                    Detail = "In Progress",
                    StatusBadge = "In Progress",
                    HasAlert = false // Critical logic depends on flags in current schema
                })
                .ToListAsync();

            return new ControlTowerCardDto
            {
                Count = count,
                PrimaryText = $"{count} tests in progress",
                Status = count > 10 ? "Needs Attention" : "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetTypistCardAsync(Guid branchId)
        {
            var query = _context.Reports
                .AsNoTracking()
                .Join(_context.Visits, r => r.VisitId, v => v.VisitId, (r, v) => new { r, v })
                .Where(x => x.v.BranchId == branchId && x.r.Status == "Draft");

            var count = await query.CountAsync();
            var items = await query
                .OrderBy(x => x.r.CreatedAt)
                .Take(3)
                .Select(x => new ControlTowerItemDto
                {
                    Id = x.r.ReportId,
                    Name = x.v.Patient != null ? $"{x.v.Patient.FirstName} {x.v.Patient.LastName}" : "Unknown",
                    Detail = "General",
                    StatusBadge = "Typing"
                })
                .ToListAsync();

            return new ControlTowerCardDto
            {
                Count = count,
                PrimaryText = $"{count} reports being typed",
                Status = "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetPathologistCardAsync(Guid branchId)
        {
            var query = _context.Reports
                .AsNoTracking()
                .Join(_context.Visits, r => r.VisitId, v => v.VisitId, (r, v) => new { r, v })
                .Where(x => x.v.BranchId == branchId && x.r.Status == "ReadyForVerification");

            var count = await query.CountAsync();
            var items = await query
                .OrderBy(x => x.r.UpdatedAt ?? x.r.CreatedAt)
                .Take(3)
                .Select(x => new ControlTowerItemDto
                {
                    Id = x.r.ReportId,
                    Name = x.v.Patient != null ? $"{x.v.Patient.FirstName} {x.v.Patient.LastName}" : "Unknown",
                    Detail = GetWaitTime((x.r.UpdatedAt ?? x.r.CreatedAt).UtcDateTime),
                    StatusBadge = "Pending Review"
                })
                .ToListAsync();

            return new ControlTowerCardDto
            {
                Count = count,
                PrimaryText = $"{count} reports waiting for you",
                Status = count > 2 ? "Requires Review" : "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetDeliveryCardAsync(Guid branchId)
        {
            var query = _context.Reports
                .AsNoTracking()
                .Join(_context.Visits, r => r.VisitId, v => v.VisitId, (r, v) => new { r, v })
                .Where(x => x.v.BranchId == branchId && (x.r.Status == "Signed" || x.r.Status == "ManualVerified"))
                .Where(x => x.r.Delivered == false);

            var count = await query.CountAsync();
            var items = await query
                .OrderBy(x => x.r.UpdatedAt ?? x.r.CreatedAt)
                .Take(3)
                .Select(x => new ControlTowerItemDto
                {
                    Id = x.r.ReportId,
                    Name = x.v.Patient != null ? $"{x.v.Patient.FirstName} {x.v.Patient.LastName}" : "Unknown",
                    Detail = "Ready",
                    StatusBadge = "Ready"
                })
                .ToListAsync();

            return new ControlTowerCardDto
            {
                Count = count,
                PrimaryText = $"{count} reports ready",
                Status = "On Track",
                Items = items
            };
        }

        private async Task<FinancialStripDto> GetFinancialsAsync(Guid branchId)
        {
            var today = DateTime.Today;

            // Definition: Collection = Payments Received Today
            var payments = await _context.Payments
                .AsNoTracking()
                .Where(p => p.Invoice != null && p.Invoice.Visit != null && p.Invoice.Visit.BranchId == branchId && p.ReceivedAt.Date == today)
                .Select(p => new { p.Amount, p.Method })
                .ToListAsync();

            var totalCollection = payments.Sum(p => p.Amount);
            var cashReceived = payments.Where(p => p.Method == "Cash").Sum(p => p.Amount);
            var onlineReceived = payments.Where(p => p.Method == "Online" || p.Method == "UPI").Sum(p => p.Amount);

            // Total Tests Done = Results generated today
            var totalTests = await _context.Results
                .AsNoTracking()
                .Where(r => r.Order != null && r.Order.Visit != null && r.Order.Visit.BranchId == branchId && r.EnteredAt.Date == today)
                .CountAsync();

            // Payouts (Stub for now as Referral engine is separate)
            decimal referralPayouts = 0; 

            return new FinancialStripDto
            {
                TotalTestsDone = totalTests,
                TotalCollectionSales = Math.Round(totalCollection, 2),
                TotalCashReceived = Math.Round(cashReceived, 2),
                OnlineReceived = Math.Round(onlineReceived, 2),
                ReferralPayouts = Math.Round(referralPayouts, 2),
                NetCashInHand = Math.Round(cashReceived - referralPayouts, 2)
            };
        }

        private static string GetWaitTime(DateTime createdAt)
        {
            var diff = DateTime.UtcNow - createdAt;
            if (diff.TotalMinutes < 1) return "Just now";
            if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes} min";
            return $"{(int)diff.TotalHours}h {(int)diff.TotalMinutes % 60}m";
        }
    }
}
