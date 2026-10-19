using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Models.Entities.Referral;
using SynOS.Models.Enums.Referral;

namespace SynOS.Services.Referral
{
    public class DoctorCrmService : IDoctorCrmService
    {
        private readonly SynOSDbContext _context;
        private readonly IReferralCommissionGoverningEngine _governingEngine;
        private readonly IAuditService _auditService;
        private readonly ILogger<DoctorCrmService> _logger;

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public DoctorCrmService(
            SynOSDbContext context,
            IReferralCommissionGoverningEngine governingEngine,
            IAuditService auditService,
            ILogger<DoctorCrmService> logger)
        {
            _context = context;
            _governingEngine = governingEngine;
            _auditService = auditService;
            _logger = logger;
        }

        public async Task<DoctorDirectoryPagedResultDto> GetDoctorDirectoryAsync(DoctorDirectoryFilterDto filter)
        {
            var query = _context.ReferralPartners.AsNoTracking();

            // 1. Text Search across Name, Clinic, Location, ContactInfo (speciality, phone)
            if (!string.IsNullOrWhiteSpace(filter.Query))
            {
                var term = filter.Query.Trim();
                query = query.Where(p => 
                    p.Name.Contains(term) ||
                    (p.ClinicName != null && p.ClinicName.Contains(term)) ||
                    (p.Location != null && p.Location.Contains(term)) ||
                    (p.ContactInfo != null && p.ContactInfo.Contains(term)));
            }

            // 2. Status Filter
            if (!string.IsNullOrWhiteSpace(filter.Status) && filter.Status != "all")
            {
                if (filter.Status == "active")
                    query = query.Where(p => p.Status == PartnerStatus.Active || p.Status == PartnerStatus.Draft);
                else if (filter.Status == "suspended")
                    query = query.Where(p => p.Status == PartnerStatus.Suspended);
            }

            // 3. Speciality Filter
            if (!string.IsNullOrWhiteSpace(filter.Speciality) && filter.Speciality != "all")
            {
                query = query.Where(p => p.ContactInfo != null && p.ContactInfo.Contains(filter.Speciality));
            }

            // 3b. Partner Type Filter (Doctor, Clinic, Hospital, RMP)
            if (!string.IsNullOrWhiteSpace(filter.PartnerType) && filter.PartnerType != "all")
            {
                if (Enum.TryParse<PartnerType>(filter.PartnerType, true, out var pType))
                {
                    query = query.Where(p => p.PartnerType == pType);
                }
            }

            var totalCount = await query.CountAsync();

            // 4. Sorting
            query = filter.SortBy switch
            {
                "recent" => query.OrderByDescending(p => p.CreatedAt),
                "clinic" => query.OrderBy(p => p.ClinicName ?? p.Name),
                _ => query.OrderBy(p => p.Name)
            };

            // 5. Pagination
            var page = Math.Max(1, filter.Page);
            var pageSize = Math.Clamp(filter.PageSize, 1, 100);
            var pagePartners = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            var partnerIds = pagePartners.Select(p => p.ReferralPartnerId).ToList();

            // 6. Fast Aggregation for the current page
            var now = DateTimeOffset.UtcNow;
            var startOfMonth = new DateTimeOffset(new DateTime(now.Year, now.Month, 1), TimeSpan.Zero);

            // Visits aggregates
            var visitStats = await _context.Visits
                .Where(v => v.ReferralPartnerId.HasValue && partnerIds.Contains(v.ReferralPartnerId.Value))
                .GroupBy(v => v.ReferralPartnerId!.Value)
                .Select(g => new
                {
                    PartnerId = g.Key,
                    TotalVisits = g.Count(),
                    ThisMonthVisits = g.Count(v => v.CreatedAt >= startOfMonth),
                    LastReferredAt = (DateTimeOffset?)g.Max(v => v.CreatedAt),
                    TotalRevenue = g.SelectMany(v => v.Orders).Sum(o => (decimal?)(o.Price - o.Discount)) ?? 0m,
                    TotalTests = g.SelectMany(v => v.Orders).Count()
                })
                .ToDictionaryAsync(s => s.PartnerId);

            // Commission Payables aggregates
            var payableStats = await _context.ReferralPayableFacts
                .Where(f => partnerIds.Contains(f.ReferralPartnerId))
                .GroupBy(f => f.ReferralPartnerId)
                .Select(g => new
                {
                    PartnerId = g.Key,
                    TotalEarned = g.Sum(f => f.Amount),
                    TotalPaid = g.Sum(f => f.AmountPaid)
                })
                .ToDictionaryAsync(s => s.PartnerId);

            // Learned Rate Card counts
            var ruleCounts = await _context.ReferralCommissionRules
                .Where(r => partnerIds.Contains(r.ReferralPartnerId) && r.IsActive)
                .GroupBy(r => r.ReferralPartnerId)
                .Select(g => new { PartnerId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.PartnerId, g => g.Count);

            // Unmapped Tests Count (tests prescribed without an active rule)
            var unmappedCounts = await (
                from v in _context.Visits
                where v.ReferralPartnerId.HasValue && partnerIds.Contains(v.ReferralPartnerId.Value)
                from o in v.Orders
                where !_context.ReferralCommissionRules.Any(r => r.ReferralPartnerId == v.ReferralPartnerId.Value && r.TestId == o.TestId && r.IsActive)
                group o.TestId by v.ReferralPartnerId!.Value into g
                select new { PartnerId = g.Key, UnmappedCount = g.Distinct().Count() }
            ).ToDictionaryAsync(x => x.PartnerId, x => x.UnmappedCount);

            // Map DTOs
            var items = pagePartners.Select(p =>
            {
                visitStats.TryGetValue(p.ReferralPartnerId, out var vs);
                payableStats.TryGetValue(p.ReferralPartnerId, out var ps);
                ruleCounts.TryGetValue(p.ReferralPartnerId, out var rc);
                unmappedCounts.TryGetValue(p.ReferralPartnerId, out var uc);

                var earned = ps?.TotalEarned ?? 0m;
                var paid = ps?.TotalPaid ?? 0m;

                return new DoctorCrmCardDto
                {
                    ReferralPartnerId = p.ReferralPartnerId,
                    Name = p.Name,
                    PartnerType = p.PartnerType,
                    ClinicName = p.ClinicName,
                    Location = p.Location,
                    Demographics = ParseDemographics(p.ContactInfo),
                    Status = p.Status,
                    PaymentCollectionModel = p.PaymentCollectionModel,
                    DefaultCommissionPercentage = p.DefaultCommissionPercentage,
                    CalculationBase = p.CalculationBase,
                    TotalPatientsReferred = vs?.TotalVisits ?? 0,
                    ThisMonthPatientsReferred = vs?.ThisMonthVisits ?? 0,
                    TotalTestsPrescribed = vs?.TotalTests ?? 0,
                    TotalRevenueGenerated = vs?.TotalRevenue ?? 0m,
                    TotalCommissionEarned = earned,
                    TotalCommissionPaid = paid,
                    PendingPayoutDue = Math.Max(0m, earned - paid),
                    LearnedRulesCount = rc,
                    UnmappedTestsCount = uc,
                    CreatedAt = p.CreatedAt,
                    LastReferredAt = vs?.LastReferredAt
                };
            }).ToList();

            // Client-side sort if revenue or unmapped selected
            if (filter.SortBy == "revenue")
                items = items.OrderByDescending(i => i.TotalRevenueGenerated).ToList();
            else if (filter.SortBy == "patients")
                items = items.OrderByDescending(i => i.TotalPatientsReferred).ToList();
            else if (filter.SortBy == "unmapped")
                items = items.OrderByDescending(i => i.UnmappedTestsCount).ToList();

            // Global Directory KPIs
            var totalDoctors = await _context.ReferralPartners.CountAsync();
            var activeReferrersThisMonth = await _context.Visits
                .Where(v => v.IsReferred && v.ReferralPartnerId.HasValue && v.CreatedAt >= startOfMonth)
                .Select(v => v.ReferralPartnerId!.Value)
                .Distinct()
                .CountAsync();

            var doctorsWithUnmapped = await (
                from v in _context.Visits
                where v.ReferralPartnerId.HasValue
                from o in v.Orders
                where !_context.ReferralCommissionRules.Any(r => r.ReferralPartnerId == v.ReferralPartnerId.Value && r.TestId == o.TestId && r.IsActive)
                select v.ReferralPartnerId!.Value
            ).Distinct().CountAsync();

            var totalLifetimeRevenue = await _context.Orders
                .Where(o => o.Visit.IsReferred && o.Visit.ReferralPartnerId.HasValue)
                .SumAsync(o => (decimal?)(o.Price - o.Discount)) ?? 0m;

            return new DoctorDirectoryPagedResultDto
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalDoctorsCount = totalDoctors,
                ActiveReferrersThisMonthCount = activeReferrersThisMonth,
                DoctorsWithUnmappedTestsCount = doctorsWithUnmapped,
                TotalLifetimeReferralRevenue = totalLifetimeRevenue
            };
        }

        public async Task<DoctorProfileDetailDto> GetDoctorProfileAsync(Guid partnerId)
        {
            var partner = await _context.ReferralPartners
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ReferralPartnerId == partnerId);

            if (partner == null)
            {
                throw new KeyNotFoundException($"Doctor with ID '{partnerId}' was not found.");
            }

            // Summary Card
            var visitsQuery = _context.Visits.Where(v => v.ReferralPartnerId == partnerId);
            var now = DateTimeOffset.UtcNow;
            var startOfMonth = new DateTimeOffset(new DateTime(now.Year, now.Month, 1), TimeSpan.Zero);

            var totalVisits = await visitsQuery.CountAsync();
            var thisMonthVisits = await visitsQuery.CountAsync(v => v.CreatedAt >= startOfMonth);
            var lastReferredAt = await visitsQuery.MaxAsync(v => (DateTimeOffset?)v.CreatedAt);
            var totalRevenue = await visitsQuery.SelectMany(v => v.Orders).SumAsync(o => (decimal?)(o.Price - o.Discount)) ?? 0m;
            var totalTests = await visitsQuery.SelectMany(v => v.Orders).CountAsync();

            var payables = await _context.ReferralPayableFacts
                .Where(f => f.ReferralPartnerId == partnerId)
                .ToListAsync();

            var totalEarned = payables.Sum(f => f.Amount);
            var totalPaid = payables.Sum(f => f.AmountPaid);

            // Learned Rate Card
            var rawLearnedRules = await _context.ReferralCommissionRules
                .Include(r => r.Test)
                    .ThenInclude(t => t.DepartmentMaster)
                .Include(r => r.Test)
                    .ThenInclude(t => t.TestPricings)
                .Where(r => r.ReferralPartnerId == partnerId && r.IsActive)
                .ToListAsync();

            var learnedRules = rawLearnedRules
                .OrderBy(r => r.Test?.TestName ?? string.Empty)
                .Select(r => new DoctorLearnedRuleReadDto
                {
                    RuleId = r.RuleId,
                    ReferralPartnerId = r.ReferralPartnerId,
                    DoctorName = partner.Name,
                    TestId = r.TestId,
                    TestCode = r.Test?.TestCode ?? string.Empty,
                    TestName = r.Test?.TestName ?? "Investigation",
                    DepartmentName = r.Test?.DepartmentMaster?.Name ?? "General Diagnostics",
                    TestPrice = r.Test?.TestPricings.FirstOrDefault()?.BasePrice ?? 0,
                    CommissionType = r.CommissionType,
                    CommissionValue = r.CommissionValue,
                    EffectiveFrom = r.EffectiveFrom,
                    IsActive = r.IsActive
                })
                .ToList();

            // Unmapped Prescribed Tests
            var unmappedTests = await (
                from v in _context.Visits
                where v.ReferralPartnerId == partnerId
                from o in v.Orders
                join t in _context.Tests.Include(x => x.DepartmentMaster).Include(x => x.TestPricings) on o.TestId equals t.TestId
                where !_context.ReferralCommissionRules.Any(r => r.ReferralPartnerId == partnerId && r.TestId == t.TestId && r.IsActive)
                group new { v, o, t } by new { t.TestId, t.TestCode, t.TestName, DeptName = (t.DepartmentMaster != null ? t.DepartmentMaster.Name : "General Diagnostics") } into g
                select new PendingLearningTestDto
                {
                    TestId = g.Key.TestId,
                    TestCode = g.Key.TestCode,
                    TestName = g.Key.TestName,
                    DepartmentName = g.Key.DeptName,
                    Price = g.SelectMany(x => x.t.TestPricings).Select(p => p.BasePrice).FirstOrDefault(),
                    PrescribedCount = g.Count(),
                    FirstPrescribedAt = g.Min(x => x.v.CreatedAt),
                    LastPrescribedAt = g.Max(x => x.v.CreatedAt),
                    SuggestedPercentage = partner.DefaultCommissionPercentage
                }
            ).ToListAsync();

            // Top Prescribed Tests
            var topTests = await (
                from v in _context.Visits
                where v.ReferralPartnerId == partnerId
                from o in v.Orders
                join t in _context.Tests.Include(x => x.DepartmentMaster) on o.TestId equals t.TestId
                group new { o, t } by new { t.TestId, t.TestCode, t.TestName, Dept = (t.DepartmentMaster != null ? t.DepartmentMaster.Name : "General Diagnostics") } into g
                orderby g.Count() descending
                select new DoctorTopTestDto
                {
                    TestId = g.Key.TestId,
                    TestCode = g.Key.TestCode,
                    TestName = g.Key.TestName,
                    DepartmentName = g.Key.Dept,
                    PrescribedCount = g.Count(),
                    TotalRevenue = g.Sum(x => x.o.Price - x.o.Discount)
                }
            ).Take(8).ToListAsync();

            // Match top tests with active rate card
            var learnedMap = learnedRules.ToDictionary(r => r.TestId);
            foreach (var top in topTests)
            {
                if (learnedMap.TryGetValue(top.TestId, out var r))
                {
                    top.HasLearnedRule = true;
                    top.CommissionType = r.CommissionType;
                    top.CommissionValue = r.CommissionValue;
                }
            }

            // Recent 10 Visits
            var recentVisitsRaw = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .Where(v => v.ReferralPartnerId == partnerId)
                .OrderByDescending(v => v.CreatedAt)
                .Take(10)
                .ToListAsync();

            var visitIds = recentVisitsRaw.Select(v => v.VisitId).ToList();
            var visitPayables = await _context.ReferralPayableFacts
                .Where(f => visitIds.Contains(f.SourceVisitId))
                .ToDictionaryAsync(f => f.SourceVisitId);

            var recentVisits = recentVisitsRaw.Select(v =>
            {
                visitPayables.TryGetValue(v.VisitId, out var payable);
                var isUnmapped = v.Orders.Any(o => !learnedMap.ContainsKey(o.TestId));
                var status = payable != null 
                    ? (payable.SettledAt != null ? "Settled" : "Recognized")
                    : (isUnmapped ? "Awaiting Rate" : "Pending");

                var patientAge = v.Patient != null ? (int)((DateTime.UtcNow - v.Patient.DateOfBirth).TotalDays / 365.25) : 0;

                return new DoctorRecentVisitDto
                {
                    VisitId = v.VisitId,
                    Token = v.Token,
                    PatientName = v.Patient?.DisplayName ?? v.Patient?.FirstName ?? "Walk-in",
                    Age = Math.Max(0, patientAge),
                    Gender = v.Patient?.Gender ?? string.Empty,
                    VisitDate = v.CreatedAt,
                    TotalBill = v.Orders.Sum(o => o.Price - o.Discount),
                    CommissionAmount = payable?.Amount ?? 0m,
                    CommissionStatus = status,
                    TestsSummary = v.Orders.Select(o => o.Test?.TestName ?? "Test").ToList()
                };
            }).ToList();

            var card = new DoctorCrmCardDto
            {
                ReferralPartnerId = partner.ReferralPartnerId,
                Name = partner.Name,
                PartnerType = partner.PartnerType,
                ClinicName = partner.ClinicName,
                Location = partner.Location,
                Demographics = ParseDemographics(partner.ContactInfo),
                Status = partner.Status == PartnerStatus.Draft ? PartnerStatus.Active : partner.Status,
                PaymentCollectionModel = partner.PaymentCollectionModel,
                DefaultCommissionPercentage = partner.DefaultCommissionPercentage,
                CalculationBase = partner.CalculationBase,
                TotalPatientsReferred = totalVisits,
                ThisMonthPatientsReferred = thisMonthVisits,
                TotalTestsPrescribed = totalTests,
                TotalRevenueGenerated = totalRevenue,
                TotalCommissionEarned = totalEarned,
                TotalCommissionPaid = totalPaid,
                PendingPayoutDue = Math.Max(0m, totalEarned - totalPaid),
                LearnedRulesCount = learnedRules.Count,
                UnmappedTestsCount = unmappedTests.Count,
                CreatedAt = partner.CreatedAt,
                LastReferredAt = lastReferredAt
            };

            return new DoctorProfileDetailDto
            {
                Profile = card,
                RateCard = learnedRules,
                UnmappedTests = unmappedTests,
                RecentVisits = recentVisits,
                TopPrescribedTests = topTests
            };
        }

        public async Task<DoctorCrmCardDto> UpdateDoctorDemographicsAsync(Guid partnerId, UpdateDoctorDemographicsRequestDto request, Guid userId)
        {
            var partner = await _context.ReferralPartners.FirstOrDefaultAsync(p => p.ReferralPartnerId == partnerId);
            if (partner == null)
            {
                throw new KeyNotFoundException($"Doctor with ID '{partnerId}' was not found.");
            }

            partner.Name = request.Name.Trim();
            partner.PartnerType = request.PartnerType;
            partner.ClinicName = request.ClinicName?.Trim();
            partner.Location = request.Location?.Trim();
            partner.PaymentCollectionModel = request.PaymentCollectionModel?.Trim();
            partner.Status = request.Status;
            partner.IsActive = request.Status == PartnerStatus.Active;
            partner.DefaultCommissionPercentage = request.DefaultCommissionPercentage;
            partner.CalculationBase = request.CalculationBase;
            partner.ContactInfo = SerializeDemographics(request.Demographics);
            partner.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(userId, "UpdateDoctorDemographics", "ReferralPartner", partnerId, request);

            var profile = await GetDoctorProfileAsync(partnerId);
            return profile.Profile;
        }

        public async Task<DoctorLearnedRuleReadDto> QuickLearnRateAsync(Guid partnerId, Guid testId, CommissionType type, decimal value, Guid userId)
        {
            var partner = await _context.ReferralPartners.FindAsync(partnerId);
            if (partner == null) throw new KeyNotFoundException("Doctor not found");

            var test = await _context.Tests
                .Include(t => t.DepartmentMaster)
                .Include(t => t.TestPricings)
                .FirstOrDefaultAsync(t => t.TestId == testId);
            if (test == null) throw new KeyNotFoundException("Test not found");

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            var existingRule = await _context.ReferralCommissionRules
                .FirstOrDefaultAsync(r => r.ReferralPartnerId == partnerId && r.TestId == testId && r.IsActive);

            if (existingRule != null)
            {
                existingRule.CommissionType = type;
                existingRule.CommissionValue = value;
                existingRule.EffectiveFrom = today;
            }
            else
            {
                existingRule = new ReferralCommissionRule
                {
                    RuleId = Guid.NewGuid(),
                    ReferralPartnerId = partnerId,
                    TestId = testId,
                    CommissionType = type,
                    CommissionValue = value,
                    EffectiveFrom = today,
                    IsActive = true,
                    AllowCommissionOnOutsourcedTests = false
                };
                _context.ReferralCommissionRules.Add(existingRule);
            }

            await _context.SaveChangesAsync();

            // Re-govern all pending visits through central governing engine
            await _governingEngine.RecalculatePartnerPendingVisitsAsync(partnerId);

            return new DoctorLearnedRuleReadDto
            {
                RuleId = existingRule.RuleId,
                ReferralPartnerId = partnerId,
                DoctorName = partner.Name,
                TestId = test.TestId,
                TestCode = test.TestCode,
                TestName = test.TestName,
                DepartmentName = test.DepartmentMaster?.Name ?? "General Diagnostics",
                TestPrice = test.TestPricings.FirstOrDefault()?.BasePrice ?? 0,
                CommissionType = type,
                CommissionValue = value,
                EffectiveFrom = today,
                IsActive = true
            };
        }

        private static DoctorDemographicsDto ParseDemographics(string? contactInfo)
        {
            if (string.IsNullOrWhiteSpace(contactInfo)) return new DoctorDemographicsDto();

            var trimmed = contactInfo.Trim();
            if (trimmed.StartsWith("{") && trimmed.EndsWith("}"))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<DoctorDemographicsDto>(trimmed, JsonOpts);
                    if (parsed != null) return parsed;
                }
                catch
                {
                    // fallback to plain phone
                }
            }

            return new DoctorDemographicsDto { Phone = trimmed };
        }

        private static string SerializeDemographics(DoctorDemographicsDto demo)
        {
            if (demo == null) return string.Empty;
            return JsonSerializer.Serialize(demo, JsonOpts);
        }
    }
}
