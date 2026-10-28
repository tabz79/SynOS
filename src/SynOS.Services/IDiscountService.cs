using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Admin;

namespace SynOS.Services
{
    public interface IDiscountService
    {
        Task<DiscountDto> CreateDiscountAsync(CreateDiscountDto createDto, Guid userId);
        Task<IEnumerable<DiscountDto>> GetDiscountsAsync(bool? isActive, bool? isEffective, string? search);
        Task<DiscountDto> GetDiscountByIdAsync(Guid id);
        Task<DiscountDto> UpdateDiscountAsync(Guid id, UpdateDiscountDto updateDto, Guid userId);
        Task<IEnumerable<DiscountHistoryItemDto>> GetDiscountHistoryAsync(string? source, DateTime? fromDate, DateTime? toDate, string? search);
        Task<ConcessionIntelligenceDto> GetConcessionIntelligenceAsync(DateTime? fromDate = null, DateTime? toDate = null);

        // Preset Discount Reasons
        Task<IEnumerable<DiscountReasonDto>> GetDiscountReasonsAsync(bool? isActive = null, string? search = null);
        Task<DiscountReasonDto> GetDiscountReasonByIdAsync(Guid id);
        Task<DiscountReasonDto> CreateDiscountReasonAsync(CreateDiscountReasonDto createDto, Guid userId);
        Task<DiscountReasonDto> UpdateDiscountReasonAsync(Guid id, UpdateDiscountReasonDto updateDto, Guid userId);
        Task<bool> DeleteDiscountReasonAsync(Guid id, Guid userId);
    }
}