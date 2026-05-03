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
            var summary = new ControlTowerSummaryDto();

            // Sequential execution to maintain EF Core thread safety on a single scoped context.
            // We wrap each sector in a local try-catch to ensure high availability.
            
            summary.Reception = await SafeFetch(() => GetReceptionCardAsync(branchId), "Reception");
            summary.Phlebotomy = await SafeFetch(() => GetPhlebotomyCardAsync(branchId), "Phlebotomy");
            summary.LabWorkbench = await SafeFetch(() => GetWorkbenchCardAsync(branchId), "LabWorkbench");
            summary.ReportsTyping = await SafeFetch(() => GetTypistCardAsync(branchId), "ReportsTyping");
            summary.Pathologist = await SafeFetch(() => GetPathologistCardAsync(branchId), "Pathologist");
            summary.Delivery = await SafeFetch(() => GetDeliveryCardAsync(branchId), "Delivery");
            summary.Financials = await SafeFetch(() => GetFinancialsAsync(branchId), "Financials") ?? new FinancialStripDto();

            return summary;
        }

        private async Task<T?> SafeFetch<T>(Func<Task<T>> action, string sector) where T : class
        {
            try 
            {
                return await action();
            }
            catch (Exception)
            {
                // In production, we would log this to a telemetry service (e.g., Application Insights)
                return null;
            }
        }

        private async Task<ControlTowerCardDto> GetReceptionCardAsync(Guid branchId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);

            var query = _context.Visits
                .AsNoTracking()
                .Where(v => v.BranchId == branchId && v.TokenDate >= today && v.TokenDate < tomorrow)
                .Where(v => v.Status == VisitStatus.Draft || v.Status == VisitStatus.PendingPayment);

            var count = await query.CountAsync();
            var rawItems = await query
                .OrderBy(v => v.CreatedAt)
                .Take(3)
                .Select(v => new { 
                    v.VisitId, 
                    PatientName = v.Patient != null ? $"{v.Patient.FirstName} {v.Patient.LastName}" : "Unknown",
                    v.CreatedAt,
                    v.Status 
                })
                .ToListAsync();

            var items = rawItems.Select(v => new ControlTowerItemDto
            {
                Id = v.VisitId,
                Name = v.PatientName,
                Detail = GetWaitTime(v.CreatedAt),
                StatusBadge = v.Status.ToString()
            }).ToList();

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
            var rawItems = await query
                .OrderBy(s => s.CreatedAt)
                .Take(3)
                .Select(s => new {
                    s.SpecimenId,
                    PatientName = s.Visit != null && s.Visit.Patient != null ? $"{s.Visit.Patient.FirstName} {s.Visit.Patient.LastName}" : "Unknown",
                    s.CreatedAt
                })
                .ToListAsync();

            var items = rawItems.Select(s => new ControlTowerItemDto
            {
                Id = s.SpecimenId,
                Name = s.PatientName,
                Detail = s.CreatedAt.ToString("hh:mm tt"),
                StatusBadge = "Pending"
            }).ToList();

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
                    HasAlert = false
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
                .Where(r => r.Visit != null && r.Visit.BranchId == branchId && r.Status == "Draft");

            var count = await query.CountAsync();
            var rawItems = await query
                .OrderBy(r => r.CreatedAt)
                .Take(3)
                .Select(r => new {
                    r.ReportId,
                    PatientName = r.Visit != null && r.Visit.Patient != null ? $"{r.Visit.Patient.FirstName} {r.Visit.Patient.LastName}" : "Unknown",
                    r.CreatedAt
                })
                .ToListAsync();

            var items = rawItems.Select(r => new ControlTowerItemDto
            {
                Id = r.ReportId,
                Name = r.PatientName,
                Detail = "General",
                StatusBadge = "Typing"
            }).ToList();

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
                .Where(r => r.Visit != null && r.Visit.BranchId == branchId && r.Status == "ReadyForVerification");

            var count = await query.CountAsync();
            var rawItems = await query
                .OrderBy(r => r.UpdatedAt ?? r.CreatedAt)
                .Take(3)
                .Select(r => new {
                    r.ReportId,
                    PatientName = r.Visit != null && r.Visit.Patient != null ? $"{r.Visit.Patient.FirstName} {r.Visit.Patient.LastName}" : "Unknown",
                    Timestamp = (r.UpdatedAt ?? r.CreatedAt)
                })
                .ToListAsync();

            var items = rawItems.Select(x => new ControlTowerItemDto
            {
                Id = x.ReportId,
                Name = x.PatientName,
                Detail = GetWaitTime(x.Timestamp.UtcDateTime),
                StatusBadge = "Pending Review"
            }).ToList();

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
                .Where(r => r.Visit != null && r.Visit.BranchId == branchId && (r.Status == "Signed" || r.Status == "ManualVerified"))
                .Where(r => r.Delivered == false);

            var count = await query.CountAsync();
            var rawItems = await query
                .OrderBy(r => r.UpdatedAt ?? r.CreatedAt)
                .Take(3)
                .Select(r => new {
                    r.ReportId,
                    PatientName = r.Visit != null && r.Visit.Patient != null ? $"{r.Visit.Patient.FirstName} {r.Visit.Patient.LastName}" : "Unknown"
                })
                .ToListAsync();

            var items = rawItems.Select(x => new ControlTowerItemDto
            {
                Id = x.ReportId,
                Name = x.PatientName,
                Detail = "Ready",
                StatusBadge = "Ready"
            }).ToList();

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
            var today = DateTime.UtcNow.Date;
            var start = new DateTimeOffset(today, TimeSpan.Zero);
            var end = start.AddDays(1);

            var payments = await _context.Payments
                .AsNoTracking()
                .Where(p => p.Invoice != null && p.Invoice.Visit != null && p.Invoice.Visit.BranchId == branchId && p.ReceivedAt >= start && p.ReceivedAt < end)
                .Select(p => new { p.Amount, p.Method })
                .ToListAsync();

            var totalCollection = payments.Sum(p => p.Amount);
            var cashReceived = payments.Where(p => p.Method == "Cash").Sum(p => p.Amount);
            var onlineReceived = payments.Where(p => p.Method == "Online" || p.Method == "UPI").Sum(p => p.Amount);

            var totalTests = await _context.Results
                .AsNoTracking()
                .Where(r => r.Order != null && r.Order.Visit != null && r.Order.Visit.BranchId == branchId && r.EnteredAt >= start && r.EnteredAt < end)
                .CountAsync();

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
