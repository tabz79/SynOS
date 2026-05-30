using AutoMapper;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Models.Entities.Referral;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.Enums.Referral;

namespace SynOS.Services.Referral
{
    public class ReferralPartnerService : IReferralPartnerService
    {
        private readonly SynOSDbContext _context;
        private readonly IMapper _mapper;
        private readonly IAuditService _auditService;
        private readonly IReferralFinancialService _referralFinancialService;
        private readonly ILogger<ReferralPartnerService> _logger;

        public ReferralPartnerService(
            SynOSDbContext context, 
            IMapper mapper, 
            IAuditService auditService,
            IReferralFinancialService referralFinancialService,
            ILogger<ReferralPartnerService> logger)
        {
            _context = context;
            _mapper = mapper;
            _auditService = auditService;
            _referralFinancialService = referralFinancialService;
            _logger = logger;
        }

        // Updated signature to accept userId? Or inject UserContext? 
        // For minimal impact on interface signature (if used elsewhere), I'll stick to interface or rely on HttpContext/UserContext being available to AuditService? 
        // AuditService.LogAsync requires userId.
        // I should probably update the interface. Let's check usage.
        // It's likely only used in this new Controller.
        
        // I will update Interface separately. For now, assuming interface matches or I update it.
        
        public async Task<ReferralPartnerReadDto> CreateReferralPartnerAsync(ReferralPartnerCreateDto createDto, Guid userId)
        {
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
            var existingPartner = await _context.ReferralPartners.FirstOrDefaultAsync(p => p.Name == createDto.Name);
            if (existingPartner != null) return _mapper.Map<ReferralPartnerReadDto>(existingPartner);

            var partner = _mapper.Map<ReferralPartner>(createDto);
            partner.ReferralPartnerId = Guid.NewGuid();
            partner.Status = PartnerStatus.Draft;
            partner.IsActive = false;
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

            return _mapper.Map<IEnumerable<ReferralPartnerReadDto>>(partners);
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

        public async Task<ReferralSummaryDto> GetReferralSummaryAsync(Guid? branchId = null)
        {
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
            
            var totalPendingPayouts = await pendingPayoutsQuery
                .Where(f => f.SettledAt == null)
                .SumAsync(f => (decimal?)(f.Amount - f.AmountPaid)) ?? 0m;

            var totalActivePartners = await _context.ReferralPartners
                .CountAsync(p => p.Status == PartnerStatus.Active);

            var totalPendingReceivables = await pendingReceivablesQuery
                .Where(f => f.SettledAt == null)
                .SumAsync(f => (decimal?)(f.Amount - f.AmountReceived)) ?? 0m;

            var referralsToday = await visitsQuery
                .Where(v => v.IsReferred && v.CreatedAt >= today)
                .CountAsync();

            var revenueToday = await invoicesQuery
                .Where(i => i.Visit != null && i.Visit.IsReferred && i.CreatedAt >= today)
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