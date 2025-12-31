using AutoMapper;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Models.Entities.Referral;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SynOS.Services.Referral
{
    public class ReferralCommissionService : IReferralCommissionService
    {
        private readonly SynOSDbContext _context;
        private readonly IMapper _mapper;

        public ReferralCommissionService(SynOSDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<ReferralCommissionRuleReadDto> CreateCommissionRuleAsync(Guid partnerId, ReferralCommissionRuleCreateDto createDto)
        {
            var partnerExists = await _context.ReferralPartners.AnyAsync(p => p.ReferralPartnerId == partnerId);
            if (!partnerExists)
            {
                throw new KeyNotFoundException($"Referral partner with ID '{partnerId}' not found.");
            }

            var testExists = await _context.Tests.AnyAsync(t => t.TestId == createDto.TestId);
            if (!testExists)
            {
                throw new KeyNotFoundException($"Test with ID '{createDto.TestId}' not found.");
            }

            // Validation: "one active commission rule per partner per test"
            var existingRule = await _context.ReferralCommissionRules
                .FirstOrDefaultAsync(r => r.ReferralPartnerId == partnerId && r.TestId == createDto.TestId && r.IsActive);
            
            if (existingRule != null && createDto.IsActive)
            {
                throw new InvalidOperationException($"An active commission rule already exists for this partner and test combination.");
            }

            var rule = _mapper.Map<ReferralCommissionRule>(createDto);
            rule.ReferralPartnerId = partnerId;

            _context.ReferralCommissionRules.Add(rule);
            await _context.SaveChangesAsync();
            return _mapper.Map<ReferralCommissionRuleReadDto>(rule);
        }

        public async Task<IEnumerable<ReferralCommissionRuleReadDto>> GetCommissionRulesForPartnerAsync(Guid partnerId)
        {
            var rules = await _context.ReferralCommissionRules
                .AsNoTracking()
                .Where(r => r.ReferralPartnerId == partnerId)
                .ToListAsync();
            return _mapper.Map<IEnumerable<ReferralCommissionRuleReadDto>>(rules);
        }

        public async Task<ReferralCommissionRuleReadDto> UpdateCommissionRuleAsync(Guid ruleId, ReferralCommissionRuleUpdateDto updateDto)
        {
            var rule = await _context.ReferralCommissionRules.FirstOrDefaultAsync(r => r.RuleId == ruleId);
            if (rule == null)
            {
                throw new KeyNotFoundException($"Commission rule with ID '{ruleId}' not found.");
            }

            // Validation: "one active commission rule per partner per test"
            var existingRule = await _context.ReferralCommissionRules
                .FirstOrDefaultAsync(r => r.ReferralPartnerId == rule.ReferralPartnerId && r.TestId == rule.TestId && r.IsActive && r.RuleId != ruleId);

            if (existingRule != null && updateDto.IsActive)
            {
                throw new InvalidOperationException($"An active commission rule already exists for this partner and test combination.");
            }

            _mapper.Map(updateDto, rule);
            await _context.SaveChangesAsync();
            return _mapper.Map<ReferralCommissionRuleReadDto>(rule);
        }

        public async Task DeleteCommissionRuleAsync(Guid ruleId)
        {
            var rule = await _context.ReferralCommissionRules.FirstOrDefaultAsync(r => r.RuleId == ruleId);
            if (rule == null)
            {
                throw new KeyNotFoundException($"Commission rule with ID '{ruleId}' not found.");
            }

            rule.IsActive = false; // Soft delete
            await _context.SaveChangesAsync();
        }
    }
}
