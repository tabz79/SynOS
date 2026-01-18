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
    }
}