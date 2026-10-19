using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs.Admin.Referral;
using SynOS.Models.Entities.Referral;
using SynOS.Models.Enums.Referral;

namespace SynOS.Services.Referral
{
    public class ReferralLearningService : IReferralLearningService
    {
        private readonly SynOSDbContext _context;
        private readonly IReferralCommissionGoverningEngine _governingEngine;
        private readonly ILogger<ReferralLearningService> _logger;

        public ReferralLearningService(
            SynOSDbContext context,
            IReferralCommissionGoverningEngine governingEngine,
            ILogger<ReferralLearningService> logger)
        {
            _context = context;
            _governingEngine = governingEngine;
            _logger = logger;
        }

        public async Task<List<PendingLearningDoctorGroupDto>> GetPendingLearningQueueAsync()
        {
            // 1. Fetch all active commission rules mapped in the system into a fast lookup set
            var activeRules = await _context.ReferralCommissionRules
                .AsNoTracking()
                .Where(r => r.IsActive)
                .Select(r => new { r.ReferralPartnerId, r.TestId })
                .ToListAsync();

            var activeRuleSet = new HashSet<(Guid PartnerId, Guid TestId)>(
                activeRules.Select(r => (r.ReferralPartnerId, r.TestId))
            );

            // 2. Fetch all visits with referrals and their orders
            var referredVisits = await _context.Visits
                .AsNoTracking()
                .Include(v => v.ReferralPartner)
                .Include(v => v.SecondaryReferralPartner)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                        .ThenInclude(t => t.DepartmentMaster)
                .Where(v => v.IsReferred && (v.ReferralPartnerId != null || v.SecondaryReferralPartnerId != null))
                .OrderByDescending(v => v.CreatedAt)
                .ToListAsync();

            var doctorGroups = new Dictionary<Guid, PendingLearningDoctorGroupDto>();

            foreach (var visit in referredVisits)
            {
                var effectivePartnerId = visit.SecondaryReferralPartnerId ?? visit.ReferralPartnerId;
                if (!effectivePartnerId.HasValue) continue;

                var partner = visit.SecondaryReferralPartner ?? visit.ReferralPartner;
                if (partner == null) continue;

                Guid partnerId = effectivePartnerId.Value;

                foreach (var order in visit.Orders)
                {
                    if (order.Test == null) continue;

                    // If this specific doctor + test already has an active rule, it is already learned!
                    if (activeRuleSet.Contains((partnerId, order.TestId)))
                    {
                        continue;
                    }

                    // Doctor needs this test mapped
                    if (!doctorGroups.TryGetValue(partnerId, out var docGroup))
                    {
                        docGroup = new PendingLearningDoctorGroupDto
                        {
                            ReferralPartnerId = partnerId,
                            DoctorName = partner.Name,
                            ClinicName = partner.ClinicName,
                            Location = partner.Location,
                            ContactInfo = partner.ContactInfo,
                            DefaultCommissionPercentage = partner.DefaultCommissionPercentage > 0
                                ? partner.DefaultCommissionPercentage
                                : 15m,
                            TotalPendingVisits = 0,
                            UnmappedTests = new List<PendingLearningTestDto>()
                        };
                        doctorGroups[partnerId] = docGroup;
                    }

                    var existingTest = docGroup.UnmappedTests.FirstOrDefault(t => t.TestId == order.TestId);
                    if (existingTest == null)
                    {
                        docGroup.UnmappedTests.Add(new PendingLearningTestDto
                        {
                            TestId = order.TestId,
                            TestCode = order.Test.TestCode,
                            TestName = order.Test.TestName,
                            DepartmentName = order.Test.DepartmentMaster?.Name ?? "General Diagnostics",
                            Price = order.Price > 0 ? order.Price : 0,
                            PrescribedCount = 1,
                            FirstPrescribedAt = visit.CreatedAt,
                            LastPrescribedAt = visit.CreatedAt,
                            SuggestedPercentage = docGroup.DefaultCommissionPercentage
                        });
                    }
                    else
                    {
                        existingTest.PrescribedCount++;
                        if (visit.CreatedAt < existingTest.FirstPrescribedAt)
                            existingTest.FirstPrescribedAt = visit.CreatedAt;
                        if (visit.CreatedAt > existingTest.LastPrescribedAt)
                            existingTest.LastPrescribedAt = visit.CreatedAt;
                    }
                }
            }

            // Calculate pending visit counts per doctor
            foreach (var kvp in doctorGroups)
            {
                var pId = kvp.Key;
                kvp.Value.TotalPendingVisits = referredVisits.Count(v => v.ReferralPartnerId == pId);
            }

            return doctorGroups.Values
                .Where(g => g.UnmappedTests.Any())
                .OrderByDescending(g => g.UnmappedTests.Count)
                .ThenByDescending(g => g.TotalPendingVisits)
                .ToList();
        }

        public async Task<CommitLearningBatchResponseDto> CommitLearnedRatesAsync(CommitLearningBatchRequestDto request, Guid userId)
        {
            if (request.Rules == null || !request.Rules.Any())
            {
                return new CommitLearningBatchResponseDto
                {
                    LearnedRulesCount = 0,
                    RecalculatedVisitsCount = 0,
                    TotalCommissionRecognized = 0,
                    Message = "No rates submitted to commit."
                };
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var affectedPartnerIds = request.Rules.Select(r => r.ReferralPartnerId).Distinct().ToList();
            var learnedCount = 0;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Commit and persist each specific Doctor + Test Rule
                foreach (var item in request.Rules)
                {
                    var existingRule = await _context.ReferralCommissionRules
                        .FirstOrDefaultAsync(r => r.ReferralPartnerId == item.ReferralPartnerId && r.TestId == item.TestId);

                    if (existingRule != null)
                    {
                        existingRule.CommissionType = item.CommissionType;
                        existingRule.CommissionValue = item.CommissionValue;
                        existingRule.EffectiveFrom = today;
                        existingRule.IsActive = true;
                    }
                    else
                    {
                        var newRule = new ReferralCommissionRule
                        {
                            RuleId = Guid.NewGuid(),
                            ReferralPartnerId = item.ReferralPartnerId,
                            TestId = item.TestId,
                            CommissionType = item.CommissionType,
                            CommissionValue = item.CommissionValue,
                            EffectiveFrom = today,
                            AllowCommissionOnOutsourcedTests = false,
                            IsActive = true
                        };
                        _context.ReferralCommissionRules.Add(newRule);
                    }

                    learnedCount++;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // 2. Central Governing Authority: Recalculate pending visits for affected doctors
                var recalculatedVisitsCount = 0;
                foreach (var partnerId in affectedPartnerIds)
                {
                    recalculatedVisitsCount += await _governingEngine.RecalculatePartnerPendingVisitsAsync(partnerId);
                }

                var totalCommissionRecognized = await _context.ReferralPayableFacts
                    .Where(f => affectedPartnerIds.Contains(f.ReferralPartnerId) && f.Status == "Pending")
                    .SumAsync(f => f.Amount);

                _logger.LogInformation("Committed {RuleCount} learned rules. Recalculated {VisitCount} visits via Governing Engine.", learnedCount, recalculatedVisitsCount);

                return new CommitLearningBatchResponseDto
                {
                    LearnedRulesCount = learnedCount,
                    RecalculatedVisitsCount = recalculatedVisitsCount,
                    TotalCommissionRecognized = totalCommissionRecognized,
                    Message = $"Successfully locked {learnedCount} rule(s) across {affectedPartnerIds.Count} doctor(s) through Commission Governing Engine."
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to commit learned referral rates.");
                throw;
            }
        }

        public async Task<List<DoctorLearnedRuleReadDto>> GetLearnedRulesForDoctorAsync(Guid partnerId)
        {
            var rules = await _context.ReferralCommissionRules
                .AsNoTracking()
                .Include(r => r.ReferralPartner)
                .Include(r => r.Test)
                    .ThenInclude(t => t.DepartmentMaster)
                .Include(r => r.Test)
                    .ThenInclude(t => t.TestPricings)
                .Where(r => r.ReferralPartnerId == partnerId && r.IsActive)
                .OrderBy(r => r.Test != null ? r.Test.TestName : "")
                .ToListAsync();

            return rules.Select(r => new DoctorLearnedRuleReadDto
            {
                RuleId = r.RuleId,
                ReferralPartnerId = r.ReferralPartnerId,
                DoctorName = r.ReferralPartner?.Name ?? "",
                TestId = r.TestId,
                TestCode = r.Test?.TestCode ?? "",
                TestName = r.Test?.TestName ?? "Diagnostic Test",
                DepartmentName = r.Test?.DepartmentMaster?.Name ?? "General Diagnostics",
                TestPrice = r.Test?.TestPricings.OrderByDescending(p => p.EffectiveFrom).FirstOrDefault()?.BasePrice ?? 0,
                CommissionType = r.CommissionType,
                CommissionValue = r.CommissionValue,
                EffectiveFrom = r.EffectiveFrom,
                IsActive = r.IsActive
            }).ToList();
        }

        public async Task<List<DoctorLearnedRuleReadDto>> SearchAllLearnedRulesAsync(string? query = null)
        {
            var q = _context.ReferralCommissionRules
                .AsNoTracking()
                .Include(r => r.ReferralPartner)
                .Include(r => r.Test)
                    .ThenInclude(t => t.DepartmentMaster)
                .Include(r => r.Test)
                    .ThenInclude(t => t.TestPricings)
                .Where(r => r.IsActive);

            if (!string.IsNullOrWhiteSpace(query))
            {
                var lower = query.Trim().ToLower();
                q = q.Where(r => (r.ReferralPartner != null && r.ReferralPartner.Name.ToLower().Contains(lower)) ||
                                 (r.Test != null && (r.Test.TestName.ToLower().Contains(lower) || r.Test.TestCode.ToLower().Contains(lower))));
            }

            var rules = await q.OrderBy(r => r.ReferralPartner != null ? r.ReferralPartner.Name : "")
                               .ThenBy(r => r.Test != null ? r.Test.TestName : "")
                               .Take(200)
                               .ToListAsync();

            return rules.Select(r => new DoctorLearnedRuleReadDto
            {
                RuleId = r.RuleId,
                ReferralPartnerId = r.ReferralPartnerId,
                DoctorName = r.ReferralPartner?.Name ?? "",
                TestId = r.TestId,
                TestCode = r.Test?.TestCode ?? "",
                TestName = r.Test?.TestName ?? "Diagnostic Test",
                DepartmentName = r.Test?.DepartmentMaster?.Name ?? "General Diagnostics",
                TestPrice = r.Test?.TestPricings.OrderByDescending(p => p.EffectiveFrom).FirstOrDefault()?.BasePrice ?? 0,
                CommissionType = r.CommissionType,
                CommissionValue = r.CommissionValue,
                EffectiveFrom = r.EffectiveFrom,
                IsActive = r.IsActive
            }).ToList();
        }

        public async Task DeleteLearnedRuleAsync(Guid ruleId)
        {
            var rule = await _context.ReferralCommissionRules.FirstOrDefaultAsync(r => r.RuleId == ruleId);
            if (rule != null)
            {
                rule.IsActive = false;
                await _context.SaveChangesAsync();
            }
        }
    }
}
