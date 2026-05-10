using AutoMapper;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Models.Entities.Referral;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SynOS.Services.Referral
{
    public class ReferralPartnerService : IReferralPartnerService
    {
        private readonly SynOSDbContext _context;
        private readonly IMapper _mapper;
        private readonly IAuditService _auditService; // ADDED

        public ReferralPartnerService(SynOSDbContext context, IMapper mapper, IAuditService auditService)
        {
            _context = context;
            _mapper = mapper;
            _auditService = auditService;
        }

        // Updated signature to accept userId? Or inject UserContext? 
        // For minimal impact on interface signature (if used elsewhere), I'll stick to interface or rely on HttpContext/UserContext being available to AuditService? 
        // AuditService.LogAsync requires userId.
        // I should probably update the interface. Let's check usage.
        // It's likely only used in this new Controller.
        
        // I will update Interface separately. For now, assuming interface matches or I update it.
        
        public async Task<ReferralPartnerReadDto> CreateReferralPartnerAsync(ReferralPartnerCreateDto createDto)
        {
            // Note: Caller (Controller) should pass userId ideally, but for now passing Guid.Empty if not provided in interface
            // Actually, I will overload or change interface. Let's change interface first.
            throw new NotImplementedException("Use the overload with userId");
        }
        
        public async Task<ReferralPartnerReadDto> CreateReferralPartnerAsync(ReferralPartnerCreateDto createDto, Guid userId)
        {
            var existingPartner = await _context.ReferralPartners.FirstOrDefaultAsync(p => p.Name == createDto.Name);
            if (existingPartner != null)
            {
                throw new InvalidOperationException($"A referral partner with the name '{createDto.Name}' already exists.");
            }

            var partner = _mapper.Map<ReferralPartner>(createDto);
            partner.ReferralPartnerId = Guid.NewGuid(); // Ensure ID
            partner.CreatedAt = DateTimeOffset.UtcNow;
            partner.UpdatedAt = DateTimeOffset.UtcNow;

            _context.ReferralPartners.Add(partner);
            await _context.SaveChangesAsync();
            
            await _auditService.LogAsync(userId, "CreateReferralPartner", "ReferralPartner", partner.ReferralPartnerId, createDto);
            
            return _mapper.Map<ReferralPartnerReadDto>(partner);
        }

        public async Task<IEnumerable<ReferralPartnerReadDto>> GetAllReferralPartnersAsync()
        {
            var partners = await _context.ReferralPartners.AsNoTracking().ToListAsync();
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

        public async Task<ReferralPartnerReadDto> UpdateReferralPartnerAsync(Guid id, ReferralPartnerUpdateDto updateDto)
        {
             throw new NotImplementedException("Use the overload with userId");
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

            // Capture old state for audit if PaymentCollectionModel changes
            var oldModel = partner.PaymentCollectionModel;

            _mapper.Map(updateDto, partner);
            partner.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(userId, "UpdateReferralPartner", "ReferralPartner", id, new { 
                Update = updateDto, 
                OldModel = oldModel, 
                NewModel = partner.PaymentCollectionModel 
            });

            return _mapper.Map<ReferralPartnerReadDto>(partner);
        }

        public async Task DeleteReferralPartnerAsync(Guid id, Guid userId)
        {
            var partner = await _context.ReferralPartners.FirstOrDefaultAsync(p => p.ReferralPartnerId == id);
            if (partner == null) throw new KeyNotFoundException("Partner not found");

            partner.IsActive = false;
            partner.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(userId, "DeactivateReferralPartner", "ReferralPartner", id, new { Active = false });
        }

        public async Task<ReferralSummaryDto> GetReferralSummaryAsync()
        {
            var today = DateTimeOffset.UtcNow.Date;
            
            var totalPendingPayouts = await _context.ReferralPayableFacts
                .Where(f => f.SettledAt == null)
                .SumAsync(f => (decimal?)(f.Amount - f.AmountPaid)) ?? 0m;

            var totalActivePartners = await _context.ReferralPartners
                .CountAsync(p => p.IsActive);

            var totalPendingReceivables = await _context.ReceivableFacts
                .Where(f => f.SettledAt == null)
                .SumAsync(f => (decimal?)(f.Amount - f.AmountReceived)) ?? 0m;

            var referralsToday = await _context.Visits
                .Where(v => v.IsReferred && v.CreatedAt >= today)
                .CountAsync();

            var revenueToday = await _context.Invoices
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