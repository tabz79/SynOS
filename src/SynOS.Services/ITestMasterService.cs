using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Admin;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface ITestMasterService
    {
        // Test management
        Task<Test> CreateTestAsync(CreateTestDto dto, Guid actorUserId);
        Task<Test> UpdateTestAsync(Guid testId, UpdateTestDto dto, Guid actorUserId);
        Task<Test?> GetTestAsync(Guid testId);
        Task<IReadOnlyList<Test>> GetTestsAsync();
        Task DeleteTestAsync(Guid testId, Guid actorUserId);

        // Lookup by code (used by reception and other flows)
        // Returns null when not found; optional dept filters the lookup.
        Task<Test?> GetTestByCodeAsync(string testCode, string? dept = null);

        // Parameter management
        Task<Parameter> AddParameterToTestAsync(Guid testId, CreateParameterDto dto, Guid actorUserId);
        Task<Parameter> UpdateParameterAsync(Guid testId, Guid parameterId, UpdateParameterDto dto, Guid actorUserId);
        Task DeleteParameterAsync(Guid testId, Guid parameterId, Guid actorUserId);

        // Reference Range management
        Task<ReferenceRange> AddReferenceRangeToParameterAsync(Guid parameterId, CreateReferenceRangeDto dto, Guid actorUserId);
        Task<ReferenceRange> UpdateReferenceRangeAsync(Guid parameterId, Guid rangeId, UpdateReferenceRangeDto dto, Guid actorUserId);
        Task DeleteReferenceRangeAsync(Guid parameterId, Guid rangeId, Guid actorUserId);
        
        // Price Config management
        Task<PriceConfig> AddOrUpdatePriceConfigAsync(Guid testId, CreatePriceConfigDto dto, Guid actorUserId);
    }
}
