using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Activity;

namespace SynOS.Services.Operational
{
    public interface IActivityStreamService
    {
        // Read-Only Projection
        Task<List<ActivityItemDto>> GetActivityForRoleAsync(Guid branchId, string role);
    }
}