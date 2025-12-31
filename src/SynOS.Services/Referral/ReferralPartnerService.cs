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

        public ReferralPartnerService(SynOSDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<ReferralPartnerReadDto> CreateReferralPartnerAsync(ReferralPartnerCreateDto createDto)
        {
            var existingPartner = await _context.ReferralPartners.FirstOrDefaultAsync(p => p.Name == createDto.Name);
            if (existingPartner != null)
            {
                throw new InvalidOperationException($"A referral partner with the name '{createDto.Name}' already exists.");
            }

            var partner = _mapper.Map<ReferralPartner>(createDto);
            _context.ReferralPartners.Add(partner);
            await _context.SaveChangesAsync();
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
            partner.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
            return _mapper.Map<ReferralPartnerReadDto>(partner);
        }

        public async Task DeleteReferralPartnerAsync(Guid id)
        {
            var partner = await _context.ReferralPartners.FirstOrDefaultAsync(p => p.ReferralPartnerId == id);
            if (partner == null)
            {
                throw new KeyNotFoundException($"Referral partner with ID '{id}' not found.");
            }

            _context.ReferralPartners.Remove(partner);
            await _context.SaveChangesAsync();
        }
    }
}
