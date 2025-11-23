using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;

namespace SynOS.Services
{
    public interface IResultService
    {
        Task<IEnumerable<ResultDto>> GetResultsForOrderAsync(Guid orderId);
        Task<IEnumerable<ResultDto>> EnterResultsAsync(Guid userId, ResultEntryRequestDto request);
        Task AutosaveResultsAsync(Guid userId, AutosaveRequestDto autosaveRequest);
        Task<string?> RecoverAutosaveAsync(Guid userId, Guid orderId);
        Task SubmitForVerificationAsync(Guid orderId);
        Task<IEnumerable<ResultDto>> GetPatientHistoryForParameterAsync(Guid patientId, string parameterCode, int limit = 3);
        Task<ResultDto> SupersedeResultAsync(Guid oldResultId, Guid userId, string newValue);
    }
}
