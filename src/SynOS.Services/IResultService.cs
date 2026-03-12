using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;
using SynOS.Models.Entities; // Added

namespace SynOS.Services
{
    public interface IResultService
    {
        Task<IEnumerable<ResultDto>> GetResultsForOrderAsync(Guid orderId);
        Task<SynOS.Models.DTOs.ResultEntryResponseDto> EnterResultsAsync(Guid userId, SynOS.Models.DTOs.ResultEntryRequestDto request);
        Task AutosaveResultsAsync(Guid userId, AutosaveRequestDto autosaveRequest);
        Task<string?> RecoverAutosaveAsync(Guid userId, Guid orderId);
        Task SubmitForVerificationAsync(Guid orderId);
        Task<IEnumerable<ResultDto>> GetPatientHistoryForParameterAsync(Guid patientId, string parameterCode, int limit = 3);
        Task<ResultDto> ReplaceResultAsync(Guid oldResultId, Guid userId, string newValue, string reason);
        Task<ResultDto> ModifyResultAsync(Guid resultId, Guid userId, string newValue, string reason);
        Task<IReadOnlyList<ResultChangeAudit>> GetResultAuditHistoryAsync(Guid resultId);
        Task DeliverReportAsync(Guid orderId);
    }
}
