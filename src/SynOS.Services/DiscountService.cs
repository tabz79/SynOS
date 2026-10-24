using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Admin;
using SynOS.Models.Entities.Discounts;
using SynOS.Models.Enums;

namespace SynOS.Services
{
    public class DiscountService : IDiscountService
    {
        private readonly SynOSDbContext _context;
        private readonly IMapper _mapper;
        private readonly IAuditService _auditService;

        public DiscountService(SynOSDbContext context, IMapper mapper, IAuditService auditService)
        {
            _context = context;
            _mapper = mapper;
            _auditService = auditService;
        }

        public async Task<DiscountDto> CreateDiscountAsync(CreateDiscountDto createDto, Guid userId)
        {
            // Validation
            if (createDto.EffectiveFrom.HasValue && createDto.EffectiveTo.HasValue && createDto.EffectiveFrom > createDto.EffectiveTo)
                throw new ArgumentException("EffectiveFrom cannot be after EffectiveTo.");

            if (createDto.Type == DiscountType.Percentage && createDto.Value > 100)
                throw new ArgumentException("Percentage discount cannot exceed 100.");

            if (createDto.Value < 0)
                throw new ArgumentException("Discount value cannot be negative.");

            // Uniqueness handled by DB, but good to check
            var exists = await _context.DiscountMasters.AnyAsync(d => d.Code == createDto.Code);
            if (exists) throw new InvalidOperationException($"Discount code '{createDto.Code}' already exists.");

            var discount = _mapper.Map<DiscountMaster>(createDto);
            discount.DiscountDefinitionId = Guid.NewGuid();
            discount.CreatedAt = DateTime.UtcNow;

            _context.DiscountMasters.Add(discount);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(userId, "CreateDiscount", "DiscountMaster", discount.DiscountDefinitionId, createDto);

            return _mapper.Map<DiscountDto>(discount);
        }

        public async Task<IEnumerable<DiscountDto>> GetDiscountsAsync(bool? isActive, bool? isEffective, string? search)
        {
            var query = _context.DiscountMasters.AsNoTracking().AsQueryable();

            if (isActive.HasValue)
                query = query.Where(d => d.IsActive == isActive.Value);

            if (isEffective.HasValue && isEffective.Value)
            {
                var now = DateTime.UtcNow;
                query = query.Where(d => 
                    (d.EffectiveFrom == null || d.EffectiveFrom <= now) &&
                    (d.EffectiveTo == null || d.EffectiveTo >= now));
            }

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(d => d.Code.Contains(search) || d.Name.Contains(search));
            }

            var list = await query.OrderByDescending(d => d.CreatedAt).ToListAsync();
            return _mapper.Map<IEnumerable<DiscountDto>>(list);
        }

        public async Task<DiscountDto> GetDiscountByIdAsync(Guid id)
        {
            var discount = await _context.DiscountMasters.FindAsync(id);
            if (discount == null) throw new KeyNotFoundException("Discount not found.");
            return _mapper.Map<DiscountDto>(discount);
        }

        public async Task<DiscountDto> UpdateDiscountAsync(Guid id, UpdateDiscountDto updateDto, Guid userId)
        {
            var discount = await _context.DiscountMasters.FindAsync(id);
            if (discount == null) throw new KeyNotFoundException("Discount not found.");

            // Validation
            if (updateDto.EffectiveFrom.HasValue && updateDto.EffectiveTo.HasValue && updateDto.EffectiveFrom > updateDto.EffectiveTo)
                throw new ArgumentException("EffectiveFrom cannot be after EffectiveTo.");
            
            // Map updates
            _mapper.Map(updateDto, discount);
            
            // Validate after mapping
             if (discount.Type == DiscountType.Percentage && discount.Value > 100)
                throw new ArgumentException("Percentage discount cannot exceed 100.");
             if (discount.Value < 0)
                throw new ArgumentException("Discount value cannot be negative.");

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(userId, "UpdateDiscount", "DiscountMaster", id, updateDto);

            return _mapper.Map<DiscountDto>(discount);
        }

        public async Task<IEnumerable<DiscountHistoryItemDto>> GetDiscountHistoryAsync(string? source, DateTime? fromDate, DateTime? toDate, string? search)
        {
            var results = new List<DiscountHistoryItemDto>();

            // 1. Patient / Counter Discounts from DiscountFacts (Default)
            if (string.IsNullOrEmpty(source) || source.Equals("All", StringComparison.OrdinalIgnoreCase) || source.Equals("Patient", StringComparison.OrdinalIgnoreCase))
            {
                var query = from df in _context.DiscountFacts.AsNoTracking()
                            join inv in _context.Invoices.AsNoTracking() on df.InvoiceId equals inv.InvoiceId
                            join v in _context.Visits.AsNoTracking() on inv.VisitId equals v.VisitId into vGroup
                            from visit in vGroup.DefaultIfEmpty()
                            join p in _context.Patients.AsNoTracking() on (visit != null ? visit.PatientId : Guid.Empty) equals p.PatientId into pGroup
                            from patient in pGroup.DefaultIfEmpty()
                            join dm in _context.DiscountMasters.AsNoTracking() on df.DiscountDefinitionId equals dm.DiscountDefinitionId into dmGroup
                            from master in dmGroup.DefaultIfEmpty()
                            where df.IsActive && df.DiscountAmount > 0
                            select new
                            {
                                df.DiscountFactId,
                                df.AppliedAt,
                                df.Type,
                                df.Value,
                                df.GrossAmount,
                                df.DiscountAmount,
                                df.NetAmountAfterDiscount,
                                df.AppliedBy,
                                Token = visit != null ? visit.Token : "",
                                PatientName = patient != null ? (patient.FirstName + " " + patient.LastName).Trim() : "",
                                PatientMrn = patient != null ? patient.MRN : "",
                                MasterName = master != null ? master.Name : "Counter Concession",
                                MasterCode = master != null ? master.Code : ""
                            };

                if (fromDate.HasValue)
                    query = query.Where(x => x.AppliedAt >= fromDate.Value);
                if (toDate.HasValue)
                    query = query.Where(x => x.AppliedAt <= toDate.Value);

                var facts = await query.OrderByDescending(x => x.AppliedAt).Take(500).ToListAsync();

                foreach (var f in facts)
                {
                    string staff = f.AppliedBy ?? "Reception";
                    string reason = "";
                    if (staff.Contains(" - "))
                    {
                        var parts = staff.Split(new[] { " - " }, 2, StringSplitOptions.None);
                        staff = parts[0];
                        reason = parts[1];
                    }

                    results.Add(new DiscountHistoryItemDto
                    {
                        Id = f.DiscountFactId,
                        OccurredAt = f.AppliedAt,
                        Source = "Patient",
                        VisitToken = f.Token,
                        PatientName = string.IsNullOrWhiteSpace(f.PatientName) ? "Patient" : f.PatientName,
                        PatientMrn = f.PatientMrn,
                        DiscountName = !string.IsNullOrEmpty(f.MasterCode) ? $"{f.MasterName} ({f.MasterCode})" : f.MasterName,
                        DiscountType = f.Type == DiscountType.Percentage ? "Percentage" : "Flat",
                        DiscountValue = f.Value,
                        GrossAmount = f.GrossAmount > 0 ? f.GrossAmount : (f.DiscountAmount + f.NetAmountAfterDiscount),
                        DiscountAmount = f.DiscountAmount,
                        NetAmount = f.NetAmountAfterDiscount,
                        AppliedBy = staff,
                        Reason = reason
                    });
                }
            }

            // 2. Partner B2B Discounts from Visits (Shown on filter toggle / selection)
            if (source != null && (source.Equals("All", StringComparison.OrdinalIgnoreCase) || source.Equals("Partner", StringComparison.OrdinalIgnoreCase) || source.Equals("B2B", StringComparison.OrdinalIgnoreCase)))
            {
                var b2bQuery = from v in _context.Visits.AsNoTracking()
                               join p in _context.Patients.AsNoTracking() on v.PatientId equals p.PatientId into pGroup
                               from patient in pGroup.DefaultIfEmpty()
                               join rp in _context.ReferralPartners.AsNoTracking() on v.ReferralPartnerId equals rp.ReferralPartnerId into rpGroup
                               from partner in rpGroup.DefaultIfEmpty()
                               join inv in _context.Invoices.AsNoTracking() on v.VisitId equals inv.VisitId into invGroup
                               from invoice in invGroup.DefaultIfEmpty()
                               where v.B2BDiscountAmount != null && v.B2BDiscountAmount > 0
                               select new
                               {
                                   v.VisitId,
                                   OccurredAt = v.B2BDiscountEnteredAt ?? v.CreatedAt,
                                   v.Token,
                                   PatientName = patient != null ? (patient.FirstName + " " + patient.LastName).Trim() : "",
                                   PatientMrn = patient != null ? patient.MRN : "",
                                   PartnerName = partner != null ? partner.Name : "Referral Partner",
                                   v.B2BDiscountType,
                                   B2BValue = v.B2BDiscountValue ?? 0,
                                   GrossAmount = invoice != null ? invoice.GrossAmount : (v.B2BDiscountAmount ?? 0),
                                   DiscountAmount = v.B2BDiscountAmount ?? 0,
                                   EnteredBy = v.B2BDiscountEnteredBy ?? "Reception"
                               };

                if (fromDate.HasValue)
                    b2bQuery = b2bQuery.Where(x => x.OccurredAt >= fromDate.Value);
                if (toDate.HasValue)
                    b2bQuery = b2bQuery.Where(x => x.OccurredAt <= toDate.Value);

                var b2bList = await b2bQuery.OrderByDescending(x => x.OccurredAt).Take(500).ToListAsync();

                foreach (var b in b2bList)
                {
                    results.Add(new DiscountHistoryItemDto
                    {
                        Id = b.VisitId,
                        OccurredAt = b.OccurredAt.DateTime,
                        Source = "Partner B2B",
                        VisitToken = b.Token,
                        PatientName = string.IsNullOrWhiteSpace(b.PatientName) ? "Patient" : b.PatientName,
                        PatientMrn = b.PatientMrn,
                        PartnerName = b.PartnerName,
                        DiscountName = $"Partner Rate: {b.PartnerName}",
                        DiscountType = b.B2BDiscountType ?? "Flat",
                        DiscountValue = b.B2BValue,
                        GrossAmount = b.GrossAmount,
                        DiscountAmount = b.DiscountAmount,
                        NetAmount = Math.Max(0, b.GrossAmount - b.DiscountAmount),
                        AppliedBy = b.EnteredBy,
                        Reason = $"B2B Discount for {b.PartnerName}"
                    });
                }
            }

            var finalQuery = results.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                finalQuery = finalQuery.Where(x =>
                    x.VisitToken.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                    x.PatientName.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                    x.AppliedBy.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                    (x.PartnerName != null && x.PartnerName.Contains(s, StringComparison.OrdinalIgnoreCase)) ||
                    x.DiscountName.Contains(s, StringComparison.OrdinalIgnoreCase));
            }

            return finalQuery.OrderByDescending(x => x.OccurredAt).ToList();
        }

        public async Task<IEnumerable<DiscountReasonDto>> GetDiscountReasonsAsync(bool? isActive = null, string? search = null)
        {
            var query = _context.DiscountReasons.AsNoTracking().AsQueryable();

            if (isActive.HasValue)
                query = query.Where(r => r.IsActive == isActive.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(r => r.ReasonText.Contains(s) || (r.Category != null && r.Category.Contains(s)) || (r.Description != null && r.Description.Contains(s)));
            }

            var list = await query
                .OrderBy(r => r.SortOrder)
                .ThenBy(r => r.ReasonText)
                .Select(r => new DiscountReasonDto
                {
                    DiscountReasonId = r.DiscountReasonId,
                    ReasonText = r.ReasonText,
                    Category = r.Category,
                    Description = r.Description,
                    IsActive = r.IsActive,
                    SortOrder = r.SortOrder,
                    CreatedBy = r.CreatedBy,
                    CreatedAt = r.CreatedAt,
                    UpdatedAt = r.UpdatedAt
                })
                .ToListAsync();

            return list;
        }

        public async Task<DiscountReasonDto> GetDiscountReasonByIdAsync(Guid id)
        {
            var reason = await _context.DiscountReasons.AsNoTracking().FirstOrDefaultAsync(r => r.DiscountReasonId == id);
            if (reason == null) throw new KeyNotFoundException($"Discount reason {id} not found.");

            return new DiscountReasonDto
            {
                DiscountReasonId = reason.DiscountReasonId,
                ReasonText = reason.ReasonText,
                Category = reason.Category,
                Description = reason.Description,
                IsActive = reason.IsActive,
                SortOrder = reason.SortOrder,
                CreatedBy = reason.CreatedBy,
                CreatedAt = reason.CreatedAt,
                UpdatedAt = reason.UpdatedAt
            };
        }

        public async Task<DiscountReasonDto> CreateDiscountReasonAsync(CreateDiscountReasonDto createDto, Guid userId)
        {
            if (string.IsNullOrWhiteSpace(createDto.ReasonText))
                throw new ArgumentException("Reason text cannot be empty.");

            var cleanText = createDto.ReasonText.Trim();
            var existing = await _context.DiscountReasons.FirstOrDefaultAsync(r => r.ReasonText.ToLower() == cleanText.ToLower());
            if (existing != null)
            {
                if (!existing.IsActive && createDto.IsActive)
                {
                    existing.IsActive = true;
                    existing.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
                return new DiscountReasonDto
                {
                    DiscountReasonId = existing.DiscountReasonId,
                    ReasonText = existing.ReasonText,
                    Category = existing.Category,
                    Description = existing.Description,
                    IsActive = existing.IsActive,
                    SortOrder = existing.SortOrder,
                    CreatedBy = existing.CreatedBy,
                    CreatedAt = existing.CreatedAt,
                    UpdatedAt = existing.UpdatedAt
                };
            }

            var user = await _context.Users.FindAsync(userId);
            string actorName = user?.Name ?? "User";

            var entity = new SynOS.Models.Entities.Discounts.DiscountReason
            {
                DiscountReasonId = Guid.NewGuid(),
                ReasonText = cleanText,
                Category = !string.IsNullOrWhiteSpace(createDto.Category) ? createDto.Category.Trim() : "General",
                Description = createDto.Description?.Trim(),
                IsActive = createDto.IsActive,
                SortOrder = createDto.SortOrder,
                CreatedBy = actorName,
                CreatedAt = DateTime.UtcNow
            };

            _context.DiscountReasons.Add(entity);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(userId, "CreateDiscountReason", "DiscountReason", entity.DiscountReasonId, createDto);

            return new DiscountReasonDto
            {
                DiscountReasonId = entity.DiscountReasonId,
                ReasonText = entity.ReasonText,
                Category = entity.Category,
                Description = entity.Description,
                IsActive = entity.IsActive,
                SortOrder = entity.SortOrder,
                CreatedBy = entity.CreatedBy,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            };
        }

        public async Task<DiscountReasonDto> UpdateDiscountReasonAsync(Guid id, UpdateDiscountReasonDto updateDto, Guid userId)
        {
            if (string.IsNullOrWhiteSpace(updateDto.ReasonText))
                throw new ArgumentException("Reason text cannot be empty.");

            var reason = await _context.DiscountReasons.FindAsync(id);
            if (reason == null) throw new KeyNotFoundException($"Discount reason {id} not found.");

            reason.ReasonText = updateDto.ReasonText.Trim();
            reason.Category = !string.IsNullOrWhiteSpace(updateDto.Category) ? updateDto.Category.Trim() : reason.Category;
            reason.Description = updateDto.Description?.Trim();
            reason.IsActive = updateDto.IsActive;
            reason.SortOrder = updateDto.SortOrder;
            reason.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(userId, "UpdateDiscountReason", "DiscountReason", id, updateDto);

            return new DiscountReasonDto
            {
                DiscountReasonId = reason.DiscountReasonId,
                ReasonText = reason.ReasonText,
                Category = reason.Category,
                Description = reason.Description,
                IsActive = reason.IsActive,
                SortOrder = reason.SortOrder,
                CreatedBy = reason.CreatedBy,
                CreatedAt = reason.CreatedAt,
                UpdatedAt = reason.UpdatedAt
            };
        }

        public async Task<bool> DeleteDiscountReasonAsync(Guid id, Guid userId)
        {
            var reason = await _context.DiscountReasons.FindAsync(id);
            if (reason == null) throw new KeyNotFoundException($"Discount reason {id} not found.");

            _context.DiscountReasons.Remove(reason);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(userId, "DeleteDiscountReason", "DiscountReason", id, null);
            return true;
        }
    }
}