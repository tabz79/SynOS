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
    }
}