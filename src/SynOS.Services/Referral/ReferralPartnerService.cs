using AutoMapper;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Models.Entities.Referral;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SynOS.Models.Enums.Referral;
using SynOS.Services.Time;

namespace SynOS.Services.Referral
{
    public class ReferralPartnerService : IReferralPartnerService
    {
        private readonly SynOSDbContext _context;
        private readonly IMapper _mapper;
        private readonly IAuditService _auditService;
        private readonly IReferralFinancialService _referralFinancialService;
        private readonly ILogger<ReferralPartnerService> _logger;
        private readonly ILabTimeProvider _labTimeProvider;

        public ReferralPartnerService(
            SynOSDbContext context, 
            IMapper mapper, 
            IAuditService auditService,
            IReferralFinancialService referralFinancialService,
            ILogger<ReferralPartnerService> logger,
            ILabTimeProvider labTimeProvider = null!)
        {
            _context = context;
            _mapper = mapper;
            _auditService = auditService;
            _referralFinancialService = referralFinancialService;
            _logger = logger;
            _labTimeProvider = labTimeProvider ?? new LabTimeProvider();
        }

        // Updated signature to accept userId? Or inject UserContext? 
        // For minimal impact on interface signature (if used elsewhere), I'll stick to interface or rely on HttpContext/UserContext being available to AuditService? 
        // AuditService.LogAsync requires userId.
        // I should probably update the interface. Let's check usage.
        // It's likely only used in this new Controller.
        
        // I will update Interface separately. For now, assuming interface matches or I update it.
        
        public async Task<ReferralPartnerReadDto> CreateReferralPartnerAsync(ReferralPartnerCreateDto createDto, Guid userId)
        {
            var reserved = new[] { "SELF", "DIRECT", "WALK-IN", "WALKIN", "SELF WALK-IN", "SELF WALKIN", "PATIENT SELF" };
            if (reserved.Any(r => string.Equals(r, createDto.Name?.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException("'SELF' is a reserved system keyword and cannot be registered as an external referral partner.");
            }

            var existingPartner = await _context.ReferralPartners.FirstOrDefaultAsync(p => p.Name == createDto.Name);
            if (existingPartner != null)
            {
                throw new InvalidOperationException($"A referral partner with the name '{createDto.Name}' already exists.");
            }

            var partner = _mapper.Map<ReferralPartner>(createDto);
            partner.ReferralPartnerId = Guid.NewGuid();
            partner.Status = PartnerStatus.Active; // Direct creation is Active
            partner.IsActive = true;
            partner.CreatedAt = DateTimeOffset.UtcNow;
            partner.UpdatedAt = DateTimeOffset.UtcNow;

            _context.ReferralPartners.Add(partner);
            await _context.SaveChangesAsync();
            
            await _auditService.LogAsync(userId, "CreateReferralPartner", "ReferralPartner", partner.ReferralPartnerId, createDto);
            
            return _mapper.Map<ReferralPartnerReadDto>(partner);
        }

        public async Task<ReferralPartnerReadDto> CreateDraftPartnerAsync(ReferralPartnerCreateDto createDto, Guid userId)
        {
            var reserved = new[] { "SELF", "DIRECT", "WALK-IN", "WALKIN", "SELF WALK-IN", "SELF WALKIN", "PATIENT SELF" };
            if (reserved.Any(r => string.Equals(r, createDto.Name?.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException("'SELF' is a reserved system keyword and cannot be registered as an external referral partner.");
            }

            var existingPartner = await _context.ReferralPartners.FirstOrDefaultAsync(p => p.Name == createDto.Name);
            if (existingPartner != null) return _mapper.Map<ReferralPartnerReadDto>(existingPartner);

            var partner = _mapper.Map<ReferralPartner>(createDto);
            partner.ReferralPartnerId = Guid.NewGuid();
            partner.Status = PartnerStatus.Active; // Auto-approved: reception doctors are immediately active, admin only sets rates
            partner.IsActive = true;
            partner.ApprovedByUserId = userId;
            partner.ApprovedAt = DateTimeOffset.UtcNow;
            partner.CreatedAt = DateTimeOffset.UtcNow;
            partner.UpdatedAt = DateTimeOffset.UtcNow;

            _context.ReferralPartners.Add(partner);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(userId, "CreateReferralPartnerDraft", "ReferralPartner", partner.ReferralPartnerId, createDto);

            return _mapper.Map<ReferralPartnerReadDto>(partner);
        }

        public async Task ApprovePartnerAsync(Guid partnerId, decimal commissionPercentage, Guid userId)
        {
            var partner = await _context.ReferralPartners.FirstOrDefaultAsync(p => p.ReferralPartnerId == partnerId);
            if (partner == null) throw new KeyNotFoundException("Partner not found");

            if (partner.Status != PartnerStatus.Draft)
            {
                throw new InvalidOperationException("Only draft partners can be approved.");
            }

            partner.Status = PartnerStatus.Active;
            partner.IsActive = true;
            partner.DefaultCommissionPercentage = commissionPercentage;
            partner.ApprovedByUserId = userId;
            partner.ApprovedAt = DateTimeOffset.UtcNow;
            partner.UpdatedAt = DateTimeOffset.UtcNow;

            // Trigger Backfill Engine
            // Note: We'll need to inject IReferralFinancialService
            // For now, assume it's injected or we add it to constructor.
            // I'll update the constructor in the next chunk.
            await _referralFinancialService.ProcessRetroactiveCommissionsAsync(partnerId, commissionPercentage, userId);

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(userId, "ApproveReferralPartner", "ReferralPartner", partnerId, new { Commission = commissionPercentage });
        }

        public async Task<IEnumerable<ReferralPartnerReadDto>> GetAllReferralPartnersAsync()
        {
            var partners = await _context.ReferralPartners.ToListAsync();
            
            // LEGACY & CONSISTENCY SYNC: 
            // 1. If IsActive is true but Status is Draft (legacy default), promote to Active.
            // 2. Ensure IsActive matches the Status (Active = true, others = false).
            var needsSync = partners.Where(p => 
                (p.IsActive && p.Status == PartnerStatus.Draft) || 
                (p.Status == PartnerStatus.Active && !p.IsActive) ||
                (p.Status != PartnerStatus.Active && p.IsActive)
            ).ToList();

            if (needsSync.Any())
            {
                foreach (var p in needsSync)
                {
                    if (p.IsActive && p.Status == PartnerStatus.Draft) p.Status = PartnerStatus.Active;
                    
                    // Sync IsActive boolean for backward compatibility
                    p.IsActive = (p.Status == PartnerStatus.Active);
                    p.UpdatedAt = DateTimeOffset.UtcNow;
                }
                await _context.SaveChangesAsync();
                _logger.LogInformation("Synced {Count} referral partners for state consistency.", needsSync.Count);
            }

            // Exclude reserved system entries (e.g. legacy DB rows named "SELF") from active doctor lists
            var cleanPartners = partners.Where(p => 
                !string.Equals(p.Name?.Trim(), "SELF", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(p.Name?.Trim(), "SELF WALK-IN", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(p.Name?.Trim(), "DIRECT", StringComparison.OrdinalIgnoreCase)
            ).ToList();

            return _mapper.Map<IEnumerable<ReferralPartnerReadDto>>(cleanPartners);
        }

        public async Task<ReferralPartnerReadDto> GetReferralPartnerByIdAsync(Guid id)
        {
            var partner = await _context.ReferralPartners.AsNoTracking().FirstOrDefaultAsync(p => p.ReferralPartnerId == id);
            if (partner == null)
            {
                throw new KeyNotFoundException($"Referral partner with ID '{id}' not found.");
            }
            return _mapper.Map<ReferralPartnerReadDto>(partner);
        }

        public async Task<ReferralPartnerReadDto> UpdateReferralPartnerAsync(Guid id, ReferralPartnerUpdateDto updateDto, Guid userId)
        {
            var reserved = new[] { "SELF", "DIRECT", "WALK-IN", "WALKIN", "SELF WALK-IN", "SELF WALKIN", "PATIENT SELF" };
            if (reserved.Any(r => string.Equals(r, updateDto.Name?.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException("'SELF' is a reserved system keyword and cannot be used as a referral partner name.");
            }

            var partner = await _context.ReferralPartners.FirstOrDefaultAsync(p => p.ReferralPartnerId == id);
            if (partner == null)
            {
                throw new KeyNotFoundException($"Referral partner with ID '{id}' not found.");
            }

            var existingPartnerWithName = await _context.ReferralPartners.FirstOrDefaultAsync(p => p.Name == updateDto.Name && p.ReferralPartnerId != id);
            if (existingPartnerWithName != null)
            {
                throw new InvalidOperationException($"A referral partner with the name '{updateDto.Name}' already exists.");
            }

            _mapper.Map(updateDto, partner);
            
            // Sync Status based on IsActive if Status wasn't explicitly provided in DTO 
            // (or just enforce consistency based on the update DTO's IsActive flag)
            if (partner.IsActive && partner.Status != PartnerStatus.Active && partner.Status != PartnerStatus.Draft)
            {
                partner.Status = PartnerStatus.Active;
            }
            else if (!partner.IsActive && partner.Status == PartnerStatus.Active)
            {
                partner.Status = PartnerStatus.Suspended;
            }

            partner.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(userId, "UpdateReferralPartner", "ReferralPartner", id, updateDto);

            return _mapper.Map<ReferralPartnerReadDto>(partner);
        }

        public async Task DeleteReferralPartnerAsync(Guid id, Guid userId)
        {
            var partner = await _context.ReferralPartners.FirstOrDefaultAsync(p => p.ReferralPartnerId == id);
            if (partner == null) throw new KeyNotFoundException("Partner not found");

            partner.Status = PartnerStatus.Suspended;
            partner.IsActive = false;
            partner.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(userId, "SuspendReferralPartner", "ReferralPartner", id, new { Active = false });
        }

        private (DateTimeOffset? startUtc, DateTimeOffset? endUtc) ResolvePresetDateRange(string? preset, DateTime? explicitStart, DateTime? explicitEnd)
        {
            if (explicitStart.HasValue || explicitEnd.HasValue)
            {
                var adjustedEnd = explicitEnd;
                if (adjustedEnd.HasValue && adjustedEnd.Value.TimeOfDay == TimeSpan.Zero)
                {
                    adjustedEnd = adjustedEnd.Value.AddDays(1).AddTicks(-1);
                }
                var s = explicitStart.HasValue ? (DateTimeOffset?)new DateTimeOffset(explicitStart.Value, TimeSpan.Zero) : null;
                var e = adjustedEnd.HasValue ? (DateTimeOffset?)new DateTimeOffset(adjustedEnd.Value, TimeSpan.Zero) : null;
                return (s, e);
            }

            if (string.IsNullOrWhiteSpace(preset))
            {
                return (null, null);
            }

            var p = preset.Trim().ToLowerInvariant();
            var istZone = _labTimeProvider.GetLabTimeZone();
            var istNow = _labTimeProvider.GetLabNow();
            var istToday = istNow.Date; // 00:00:00 IST

            DateTime istStart;
            DateTime istEnd;

            switch (p)
            {
                case "today":
                    istStart = istToday;
                    istEnd = istToday.AddDays(1).AddTicks(-1);
                    break;
                case "yesterday":
                    istStart = istToday.AddDays(-1);
                    istEnd = istToday.AddTicks(-1);
                    break;
                case "this week":
                case "week":
                    istStart = istToday.AddDays(-6);
                    istEnd = istToday.AddDays(1).AddTicks(-1);
                    break;
                case "this month":
                case "month":
                    istStart = new DateTime(istToday.Year, istToday.Month, 1);
                    istEnd = istStart.AddMonths(1).AddTicks(-1);
                    break;
                case "this quarter":
                case "quarter":
                case string q when q.StartsWith("q"):
                    var quarter = (istToday.Month - 1) / 3 + 1;
                    var qStartMonth = (quarter - 1) * 3 + 1;
                    istStart = new DateTime(istToday.Year, qStartMonth, 1);
                    istEnd = istStart.AddMonths(3).AddTicks(-1);
                    break;
                case "this year":
                case "year":
                case "fy":
                    var fyStartYear = istToday.Month >= 4 ? istToday.Year : istToday.Year - 1;
                    istStart = new DateTime(fyStartYear, 4, 1);
                    istEnd = istStart.AddYears(1).AddTicks(-1);
                    break;
                case "all":
                case "all time":
                    return (null, null);
                default:
                    return (null, null);
            }

            var startUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(istStart, DateTimeKind.Unspecified), istZone);
            var endUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(istEnd, DateTimeKind.Unspecified), istZone);
            return (new DateTimeOffset(startUtc), new DateTimeOffset(endUtc));
        }

        public async Task<ReferralSummaryDto> GetReferralSummaryAsync(
            Guid? branchId = null,
            string? preset = null,
            DateTime? startDate = null,
            DateTime? endDate = null)
        {
            var (startUtc, endUtc) = ResolvePresetDateRange(preset, startDate, endDate);
            var today = DateTimeOffset.UtcNow.Date;
            
            var pendingPayoutsQuery = _context.ReferralPayableFacts.AsNoTracking();
            var pendingReceivablesQuery = _context.ReceivableFacts.AsNoTracking();
            var visitsQuery = _context.Visits.AsNoTracking();
            var invoicesQuery = _context.Invoices.AsNoTracking();
            
            if (branchId.HasValue)
            {
                pendingPayoutsQuery = from f in pendingPayoutsQuery
                                      join v in _context.Visits on f.SourceVisitId equals v.VisitId
                                      where v.BranchId == branchId.Value
                                      select f;
                                      
                pendingReceivablesQuery = from f in pendingReceivablesQuery
                                          join v in _context.Visits on f.SourceVisitId equals v.VisitId
                                          where v.BranchId == branchId.Value
                                          select f;
                                          
                visitsQuery = visitsQuery.Where(v => v.BranchId == branchId.Value);
                
                invoicesQuery = invoicesQuery.Where(i => i.Visit != null && i.Visit.BranchId == branchId.Value);
            }

            if (startUtc.HasValue)
            {
                pendingPayoutsQuery = pendingPayoutsQuery.Where(f => f.OccurredAt >= startUtc.Value);
                pendingReceivablesQuery = pendingReceivablesQuery.Where(f => f.OccurredAt >= startUtc.Value);
                visitsQuery = visitsQuery.Where(v => v.CreatedAt >= startUtc.Value);
                invoicesQuery = invoicesQuery.Where(i => i.CreatedAt >= startUtc.Value);
            }
            if (endUtc.HasValue)
            {
                pendingPayoutsQuery = pendingPayoutsQuery.Where(f => f.OccurredAt <= endUtc.Value);
                pendingReceivablesQuery = pendingReceivablesQuery.Where(f => f.OccurredAt <= endUtc.Value);
                visitsQuery = visitsQuery.Where(v => v.CreatedAt <= endUtc.Value);
                invoicesQuery = invoicesQuery.Where(i => i.CreatedAt <= endUtc.Value);
            }
            
            var totalPendingPayouts = await pendingPayoutsQuery
                .Where(f => f.SettledAt == null)
                .SumAsync(f => (decimal?)(f.Amount - f.AmountPaid)) ?? 0m;

            var totalActivePartners = await _context.ReferralPartners
                .CountAsync(p => p.Status == PartnerStatus.Active);

            var totalPendingReceivables = await pendingReceivablesQuery
                .Where(f => f.SettledAt == null)
                .SumAsync(f => (decimal?)(f.Amount - f.AmountReceived)) ?? 0m;

            var referralsToday = await visitsQuery
                .Where(v => v.IsReferred && (startUtc.HasValue || v.CreatedAt >= today))
                .CountAsync();

            var revenueToday = await invoicesQuery
                .Where(i => i.Visit != null && i.Visit.IsReferred && (startUtc.HasValue || i.CreatedAt >= today))
                .SumAsync(i => (decimal?)i.Total) ?? 0m;

            return new ReferralSummaryDto
            {
                TotalPendingPayouts = totalPendingPayouts,
                TotalActivePartners = totalActivePartners,
                TotalPendingReceivables = totalPendingReceivables,
                NewReferralsToday = referralsToday,
                TotalReferralRevenueToday = revenueToday
            };
        }

        public async Task<IEnumerable<ReferralCommissionRuleReadDto>> GetAllCommissionRulesAsync()
        {
            var rules = await _context.ReferralCommissionRules
                .Include(r => r.ReferralPartner)
                .Include(r => r.Test)
                .AsNoTracking()
                .ToListAsync();
            return _mapper.Map<IEnumerable<ReferralCommissionRuleReadDto>>(rules);
        }

        public async Task<ReferralCommissionRuleReadDto> CreateCommissionRuleAsync(ReferralCommissionRuleCreateDto dto, Guid userId)
        {
            var rule = _mapper.Map<ReferralCommissionRule>(dto);
            rule.RuleId = Guid.NewGuid();
            
            _context.ReferralCommissionRules.Add(rule);
            await _context.SaveChangesAsync();
            
            await _auditService.LogAsync(userId, "CreateCommissionRule", "ReferralCommissionRule", rule.RuleId, dto);

            // Re-fetch with includes for DTO mapping
            var created = await _context.ReferralCommissionRules
                .Include(r => r.ReferralPartner)
                .Include(r => r.Test)
                .FirstAsync(r => r.RuleId == rule.RuleId);

            return _mapper.Map<ReferralCommissionRuleReadDto>(created);
        }

        public async Task DeleteCommissionRuleAsync(Guid id, Guid userId)
        {
            var rule = await _context.ReferralCommissionRules.FindAsync(id);
            if (rule != null)
            {
                _context.ReferralCommissionRules.Remove(rule);
                await _context.SaveChangesAsync();
                await _auditService.LogAsync(userId, "DeleteCommissionRule", "ReferralCommissionRule", id, null);
            }
        }
    }
}