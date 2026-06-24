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

        public async Task<ControlTowerSummaryDto> GetFullDashboardAsync(Guid? branchId)
        {
            var summary = new ControlTowerSummaryDto();

            // Sequential execution to maintain EF Core thread safety on a single scoped context.
            // We wrap each sector in a local try-catch to ensure high availability.
            
            summary.Reception = await SafeFetch(() => GetReceptionCardAsync(branchId), "Reception") ?? new();
            summary.Phlebotomy = await SafeFetch(() => GetPhlebotomyCardAsync(branchId), "Phlebotomy") ?? new();
            summary.LabWorkbench = await SafeFetch(() => GetWorkbenchCardAsync(branchId), "LabWorkbench") ?? new();
            summary.ReportsTyping = await SafeFetch(() => GetTypistCardAsync(branchId), "ReportsTyping") ?? new();
            summary.Pathologist = await SafeFetch(() => GetPathologistCardAsync(branchId), "Pathologist") ?? new();
            summary.Delivery = await SafeFetch(() => GetDeliveryCardAsync(branchId), "Delivery") ?? new();
            summary.XRayTech = await SafeFetch(() => GetXRayTechCardAsync(branchId), "XRayTech") ?? new();
            summary.USTech = await SafeFetch(() => GetUSTechCardAsync(branchId), "USTech") ?? new();
            summary.CTTech = await SafeFetch(() => GetCTTechCardAsync(branchId), "CTTech") ?? new();
            summary.MriTech = await SafeFetch(() => GetMriTechCardAsync(branchId), "MriTech") ?? new();
            summary.Radiologist = await SafeFetch(() => GetRadiologistCardAsync(branchId), "Radiologist") ?? new();
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

        private async Task<ControlTowerCardDto> GetReceptionCardAsync(Guid? branchId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);

            var backlogQuery = _context.Visits
                .AsNoTracking()
                .Where(v => v.Status == VisitStatus.Draft || v.Status == VisitStatus.PendingPayment);

            var throughputQuery = _context.Visits
                .AsNoTracking()
                .Where(v => v.TokenDate >= today && v.TokenDate < tomorrow && 
                           (v.Status == VisitStatus.Paid || v.Status == VisitStatus.FullPaid || v.Status == VisitStatus.InPhlebotomy || v.Status == VisitStatus.InLab || v.Status == VisitStatus.Completed || v.Status == VisitStatus.Finalized));

            if (branchId.HasValue)
            {
                backlogQuery = backlogQuery.Where(v => v.BranchId == branchId.Value);
                throughputQuery = throughputQuery.Where(v => v.BranchId == branchId.Value);
            }

            var backlogCount = await backlogQuery.CountAsync();
            var throughputCount = await throughputQuery.CountAsync();

            var rawItems = await backlogQuery
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
                Count = throughputCount,
                PrimaryText = "patients billed today",
                SecondaryText = $"{backlogCount} awaiting payment",
                Status = backlogCount > 5 ? "Needs Attention" : "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetPhlebotomyCardAsync(Guid? branchId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);
            var todayOffset = new DateTimeOffset(today);
            var tomorrowOffset = todayOffset.AddDays(1);

            var backlogQuery = _context.Specimens
                .AsNoTracking()
                .Where(s => s.Status == SpecimenStatus.Pending && s.Visit != null && 
                           (s.Visit.Status == VisitStatus.Paid || s.Visit.Status == VisitStatus.FullPaid || s.Visit.Status == VisitStatus.InPhlebotomy));

            var throughputQuery = _context.Specimens
                .AsNoTracking()
                .Where(s => s.Status == SpecimenStatus.Collected && s.CollectedAt >= todayOffset && s.CollectedAt < tomorrowOffset);

            if (branchId.HasValue)
            {
                backlogQuery = backlogQuery.Where(s => s.Visit != null && s.Visit.BranchId == branchId.Value);
                throughputQuery = throughputQuery.Where(s => s.Visit != null && s.Visit.BranchId == branchId.Value);
            }

            var backlogCount = await backlogQuery.Select(s => s.VisitId).Distinct().CountAsync();
            var throughputCount = await throughputQuery.Select(s => s.VisitId).Distinct().CountAsync();

            var rawItems = await backlogQuery
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
                Count = throughputCount,
                PrimaryText = "patients collected today",
                SecondaryText = $"{backlogCount} waiting collection",
                Status = backlogCount > 3 ? "Needs Attention" : "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetWorkbenchCardAsync(Guid? branchId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);
            var todayOffset = new DateTimeOffset(today);
            var tomorrowOffset = todayOffset.AddDays(1);

            var backlogQuery = _context.Orders
                .AsNoTracking()
                .Where(o => o.Department != "Radiology" && (o.Status == OrderStatus.Active || o.Status == OrderStatus.Collected));

            var throughputQuery = _context.Orders
                .AsNoTracking()
                .Where(o => o.Department != "Radiology" && o.Status == OrderStatus.Completed && o.CreatedAt >= todayOffset && o.CreatedAt < tomorrowOffset);

            if (branchId.HasValue)
            {
                backlogQuery = backlogQuery.Where(o => o.Visit != null && o.Visit.BranchId == branchId.Value);
                throughputQuery = throughputQuery.Where(o => o.Visit != null && o.Visit.BranchId == branchId.Value);
            }

            var backlogCount = await backlogQuery.CountAsync();
            var throughputCount = await throughputQuery.CountAsync();

            var rawItems = await backlogQuery
                .OrderBy(o => o.CreatedAt)
                .Take(3)
                .Select(o => new {
                    o.OrderId,
                    Name = o.TestCode,
                    Detail = "In Progress"
                })
                .ToListAsync();

            var items = rawItems.Select(o => new ControlTowerItemDto
            {
                Id = o.OrderId,
                Name = o.Name,
                Detail = o.Detail,
                StatusBadge = "In Progress"
            }).ToList();

            return new ControlTowerCardDto
            {
                Count = throughputCount,
                PrimaryText = "orders processed today",
                SecondaryText = $"{backlogCount} in processing",
                Status = backlogCount > 10 ? "Needs Attention" : "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetTypistCardAsync(Guid? branchId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);
            var todayOffset = new DateTimeOffset(today);
            var tomorrowOffset = todayOffset.AddDays(1);

            var backlogQuery = _context.Reports
                .AsNoTracking()
                .Where(r => r.Status == "Draft");

            var throughputQuery = _context.Reports
                .AsNoTracking()
                .Where(r => r.Status != "Draft" && r.UpdatedAt >= todayOffset && r.UpdatedAt < tomorrowOffset);

            if (branchId.HasValue)
            {
                backlogQuery = backlogQuery.Where(r => r.Visit != null && r.Visit.BranchId == branchId.Value);
                throughputQuery = throughputQuery.Where(r => r.Visit != null && r.Visit.BranchId == branchId.Value);
            }

            var backlogCount = await backlogQuery.CountAsync();
            var throughputCount = await throughputQuery.CountAsync();

            var rawItems = await backlogQuery
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
                Count = throughputCount,
                PrimaryText = "reports typed today",
                SecondaryText = $"{backlogCount} awaiting typing",
                Status = "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetPathologistCardAsync(Guid? branchId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);
            var todayOffset = new DateTimeOffset(today);
            var tomorrowOffset = todayOffset.AddDays(1);

            var backlogQuery = _context.Reports
                .AsNoTracking()
                .Where(r => r.Status == "ReadyForVerification");

            var throughputQuery = _context.Reports
                .AsNoTracking()
                .Where(r => (r.Status == "Signed" || r.Status == "ManualVerified") && r.SignedAt >= todayOffset && r.SignedAt < tomorrowOffset);

            if (branchId.HasValue)
            {
                backlogQuery = backlogQuery.Where(r => r.Visit != null && r.Visit.BranchId == branchId.Value);
                throughputQuery = throughputQuery.Where(r => r.Visit != null && r.Visit.BranchId == branchId.Value);
            }

            var backlogCount = await backlogQuery.CountAsync();
            var throughputCount = await throughputQuery.CountAsync();

            var rawItems = await backlogQuery
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
                Count = throughputCount,
                PrimaryText = "reports verified today",
                SecondaryText = $"{backlogCount} awaiting verification",
                Status = backlogCount > 2 ? "Requires Review" : "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetDeliveryCardAsync(Guid? branchId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);
            var todayOffset = new DateTimeOffset(today);
            var tomorrowOffset = todayOffset.AddDays(1);

            var backlogQuery = _context.Reports
                .AsNoTracking()
                .Where(r => (r.Status == "Signed" || r.Status == "ManualVerified") && r.Delivered == false);

            var throughputQuery = _context.Reports
                .AsNoTracking()
                .Where(r => r.Delivered == true && r.DeliveredAt >= todayOffset && r.DeliveredAt < tomorrowOffset);

            if (branchId.HasValue)
            {
                backlogQuery = backlogQuery.Where(r => r.Visit != null && r.Visit.BranchId == branchId.Value);
                throughputQuery = throughputQuery.Where(r => r.Visit != null && r.Visit.BranchId == branchId.Value);
            }

            var backlogCount = await backlogQuery.CountAsync();
            var throughputCount = await throughputQuery.CountAsync();

            var rawItems = await backlogQuery
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
                Count = throughputCount,
                PrimaryText = "reports delivered today",
                SecondaryText = $"{backlogCount} awaiting dispatch",
                Status = "On Track",
                Items = items
            };
        }

        private async Task<FinancialStripDto> GetFinancialsAsync(Guid? branchId)
        {
            var today = DateTime.UtcNow.Date;
            var start = new DateTimeOffset(today, TimeSpan.Zero);
            var end = start.AddDays(1);

            var paymentsQuery = _context.Payments
                .AsNoTracking()
                .Where(p => p.ReceivedAt >= start && p.ReceivedAt < end);

            if (branchId.HasValue)
            {
                paymentsQuery = paymentsQuery.Where(p => p.Invoice != null && p.Invoice.Visit != null && p.Invoice.Visit.BranchId == branchId.Value);
            }

            var payments = await paymentsQuery
                .Select(p => new { p.Amount, p.Method })
                .ToListAsync();

            var totalCollection = payments.Sum(p => p.Amount);
            var cashReceived = payments.Where(p => p.Method == "Cash").Sum(p => p.Amount);
            var onlineReceived = payments.Where(p => p.Method == "Online" || p.Method == "UPI").Sum(p => p.Amount);

            var testsQuery = _context.Results
                .AsNoTracking()
                .Where(r => r.EnteredAt >= start && r.EnteredAt < end);

            if (branchId.HasValue)
            {
                testsQuery = testsQuery.Where(r => r.Order != null && r.Order.Visit != null && r.Order.Visit.BranchId == branchId.Value);
            }

            var totalTests = await testsQuery.CountAsync();

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

        private async Task<ControlTowerCardDto> GetXRayTechCardAsync(Guid? branchId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);
            var todayOffset = new DateTimeOffset(today);
            var tomorrowOffset = todayOffset.AddDays(1);

            var backlogQuery = _context.RadiologyStudies
                .AsNoTracking()
                .Where(s => !s.IsSoftDeleted && (s.Status == "PendingImaging" || s.Status == "Assigned") && s.Modality == "X-Ray");

            var throughputQuery = _context.RadiologyStudies
                .AsNoTracking()
                .Where(s => !s.IsSoftDeleted && s.Modality == "X-Ray" && s.Status != "PendingImaging" && s.Status != "Assigned" && s.LastActivityAt >= todayOffset && s.LastActivityAt < tomorrowOffset);

            if (branchId.HasValue)
            {
                backlogQuery = backlogQuery.Where(s => s.Visit != null && s.Visit.BranchId == branchId.Value);
                throughputQuery = throughputQuery.Where(s => s.Visit != null && s.Visit.BranchId == branchId.Value);
            }

            var backlogCount = await backlogQuery.CountAsync();
            var throughputCount = await throughputQuery.CountAsync();

            var rawItems = await backlogQuery
                .OrderBy(s => s.CreatedAt)
                .Take(3)
                .Select(s => new {
                    s.RadiologyStudyId,
                    PatientName = s.Patient != null ? $"{s.Patient.FirstName} {s.Patient.LastName}" : "Unknown",
                    TestName = s.Order != null && s.Order.Test != null ? s.Order.Test.TestName : "X-Ray Study",
                    s.Status
                })
                .ToListAsync();

            var items = rawItems.Select(s => new ControlTowerItemDto
            {
                Id = s.RadiologyStudyId,
                Name = s.PatientName,
                Detail = s.TestName,
                StatusBadge = s.Status == "Assigned" ? "Assigned" : "Pending"
            }).ToList();

            return new ControlTowerCardDto
            {
                Count = throughputCount,
                PrimaryText = "scans completed today",
                SecondaryText = $"{backlogCount} pending scans",
                Status = backlogCount > 3 ? "Needs Attention" : "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetUSTechCardAsync(Guid? branchId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);
            var todayOffset = new DateTimeOffset(today);
            var tomorrowOffset = todayOffset.AddDays(1);

            var backlogQuery = _context.RadiologyStudies
                .AsNoTracking()
                .Where(s => !s.IsSoftDeleted && (s.Status == "PendingImaging" || s.Status == "Assigned") && s.Modality == "Ultrasound");

            var throughputQuery = _context.RadiologyStudies
                .AsNoTracking()
                .Where(s => !s.IsSoftDeleted && s.Modality == "Ultrasound" && s.Status != "PendingImaging" && s.Status != "Assigned" && s.LastActivityAt >= todayOffset && s.LastActivityAt < tomorrowOffset);

            if (branchId.HasValue)
            {
                backlogQuery = backlogQuery.Where(s => s.Visit != null && s.Visit.BranchId == branchId.Value);
                throughputQuery = throughputQuery.Where(s => s.Visit != null && s.Visit.BranchId == branchId.Value);
            }

            var backlogCount = await backlogQuery.CountAsync();
            var throughputCount = await throughputQuery.CountAsync();

            var rawItems = await backlogQuery
                .OrderBy(s => s.CreatedAt)
                .Take(3)
                .Select(s => new {
                    s.RadiologyStudyId,
                    PatientName = s.Patient != null ? $"{s.Patient.FirstName} {s.Patient.LastName}" : "Unknown",
                    TestName = s.Order != null && s.Order.Test != null ? s.Order.Test.TestName : "Ultrasound Study",
                    s.Status
                })
                .ToListAsync();

            var items = rawItems.Select(s => new ControlTowerItemDto
            {
                Id = s.RadiologyStudyId,
                Name = s.PatientName,
                Detail = s.TestName,
                StatusBadge = s.Status == "Assigned" ? "Assigned" : "Pending"
            }).ToList();

            return new ControlTowerCardDto
            {
                Count = throughputCount,
                PrimaryText = "scans completed today",
                SecondaryText = $"{backlogCount} pending scans",
                Status = backlogCount > 3 ? "Needs Attention" : "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetCTTechCardAsync(Guid? branchId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);
            var todayOffset = new DateTimeOffset(today);
            var tomorrowOffset = todayOffset.AddDays(1);

            var backlogQuery = _context.RadiologyStudies
                .AsNoTracking()
                .Where(s => !s.IsSoftDeleted && (s.Status == "PendingImaging" || s.Status == "Assigned") && s.Modality == "CT Scan");

            var throughputQuery = _context.RadiologyStudies
                .AsNoTracking()
                .Where(s => !s.IsSoftDeleted && s.Modality == "CT Scan" && s.Status != "PendingImaging" && s.Status != "Assigned" && s.LastActivityAt >= todayOffset && s.LastActivityAt < tomorrowOffset);

            if (branchId.HasValue)
            {
                backlogQuery = backlogQuery.Where(s => s.Visit != null && s.Visit.BranchId == branchId.Value);
                throughputQuery = throughputQuery.Where(s => s.Visit != null && s.Visit.BranchId == branchId.Value);
            }

            var backlogCount = await backlogQuery.CountAsync();
            var throughputCount = await throughputQuery.CountAsync();

            var rawItems = await backlogQuery
                .OrderBy(s => s.CreatedAt)
                .Take(3)
                .Select(s => new {
                    s.RadiologyStudyId,
                    PatientName = s.Patient != null ? $"{s.Patient.FirstName} {s.Patient.LastName}" : "Unknown",
                    TestName = s.Order != null && s.Order.Test != null ? s.Order.Test.TestName : "CT Scan Study",
                    s.Status
                })
                .ToListAsync();

            var items = rawItems.Select(s => new ControlTowerItemDto
            {
                Id = s.RadiologyStudyId,
                Name = s.PatientName,
                Detail = s.TestName,
                StatusBadge = s.Status == "Assigned" ? "Assigned" : "Pending"
            }).ToList();

            return new ControlTowerCardDto
            {
                Count = throughputCount,
                PrimaryText = "scans completed today",
                SecondaryText = $"{backlogCount} pending scans",
                Status = backlogCount > 3 ? "Needs Attention" : "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetMriTechCardAsync(Guid? branchId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);
            var todayOffset = new DateTimeOffset(today);
            var tomorrowOffset = todayOffset.AddDays(1);

            var backlogQuery = _context.RadiologyStudies
                .AsNoTracking()
                .Where(s => !s.IsSoftDeleted && (s.Status == "PendingImaging" || s.Status == "Assigned") && s.Modality == "MRI");

            var throughputQuery = _context.RadiologyStudies
                .AsNoTracking()
                .Where(s => !s.IsSoftDeleted && s.Modality == "MRI" && s.Status != "PendingImaging" && s.Status != "Assigned" && s.LastActivityAt >= todayOffset && s.LastActivityAt < tomorrowOffset);

            if (branchId.HasValue)
            {
                backlogQuery = backlogQuery.Where(s => s.Visit != null && s.Visit.BranchId == branchId.Value);
                throughputQuery = throughputQuery.Where(s => s.Visit != null && s.Visit.BranchId == branchId.Value);
            }

            var backlogCount = await backlogQuery.CountAsync();
            var throughputCount = await throughputQuery.CountAsync();

            var rawItems = await backlogQuery
                .OrderBy(s => s.CreatedAt)
                .Take(3)
                .Select(s => new {
                    s.RadiologyStudyId,
                    PatientName = s.Patient != null ? $"{s.Patient.FirstName} {s.Patient.LastName}" : "Unknown",
                    TestName = s.Order != null && s.Order.Test != null ? s.Order.Test.TestName : "MRI Study",
                    s.Status
                })
                .ToListAsync();

            var items = rawItems.Select(s => new ControlTowerItemDto
            {
                Id = s.RadiologyStudyId,
                Name = s.PatientName,
                Detail = s.TestName,
                StatusBadge = s.Status == "Assigned" ? "Assigned" : "Pending"
            }).ToList();

            return new ControlTowerCardDto
            {
                Count = throughputCount,
                PrimaryText = "scans completed today",
                SecondaryText = $"{backlogCount} pending scans",
                Status = backlogCount > 3 ? "Needs Attention" : "On Track",
                Items = items
            };
        }

        private async Task<ControlTowerCardDto> GetRadiologistCardAsync(Guid? branchId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);
            var todayOffset = new DateTimeOffset(today);
            var tomorrowOffset = todayOffset.AddDays(1);

            var backlogQuery = _context.RadiologyStudies
                .AsNoTracking()
                .Where(s => !s.IsSoftDeleted && (s.Status == "AwaitingDictation" || s.Status == "DictationSessionStarted" || s.Status == "DraftReady" || s.Status == "AwaitingSignature"));

            var throughputQuery = _context.RadiologyStudies
                .AsNoTracking()
                .Where(s => !s.IsSoftDeleted && s.Status == "Signed" && s.LastActivityAt >= todayOffset && s.LastActivityAt < tomorrowOffset);

            if (branchId.HasValue)
            {
                backlogQuery = backlogQuery.Where(s => s.Visit != null && s.Visit.BranchId == branchId.Value);
                throughputQuery = throughputQuery.Where(s => s.Visit != null && s.Visit.BranchId == branchId.Value);
            }

            var backlogCount = await backlogQuery.CountAsync();
            var throughputCount = await throughputQuery.CountAsync();

            var rawItems = await backlogQuery
                .OrderBy(s => s.CreatedAt)
                .Take(3)
                .Select(s => new {
                    s.RadiologyStudyId,
                    PatientName = s.Patient != null ? $"{s.Patient.FirstName} {s.Patient.LastName}" : "Unknown",
                    TestName = s.Order != null && s.Order.Test != null ? s.Order.Test.TestName : "Radiology Study",
                    s.Status
                })
                .ToListAsync();

            var items = rawItems.Select(s => new ControlTowerItemDto
            {
                Id = s.RadiologyStudyId,
                Name = s.PatientName,
                Detail = s.TestName,
                StatusBadge = s.Status switch
                {
                    "AwaitingDictation" => "Awaiting",
                    "DictationSessionStarted" => "Drafting",
                    "DraftReady" => "Draft",
                    "AwaitingSignature" => "Signing",
                    _ => s.Status
                }
            }).ToList();

            return new ControlTowerCardDto
            {
                Count = throughputCount,
                PrimaryText = "scans reported today",
                SecondaryText = $"{backlogCount} awaiting reporting",
                Status = backlogCount > 3 ? "Needs Attention" : "On Track",
                Items = items
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
