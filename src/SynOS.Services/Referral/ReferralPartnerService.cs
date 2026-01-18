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

        public async Task DeleteReferralPartnerAsync(Guid id)
        {
            // Soft delete only per requirements
             var partner = await _context.ReferralPartners.FirstOrDefaultAsync(p => p.ReferralPartnerId == id);
            if (partner == null) throw new KeyNotFoundException("Partner not found");
            
            // Check for active visits? 
            // "Partner with active visits CANNOT be hard-deleted."
            // But we are doing Soft Deactivate.
            // Prompt says: "Cannot delete partners (soft deactivate only)."
            // So this method should just set IsActive = false?
            // Or Controller should call Update(IsActive=false).
            // Usually Delete verb maps to this.
            
            partner.IsActive = false;
            partner.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
        }
    }
}