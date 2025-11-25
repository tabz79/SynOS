using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;

namespace SynOS.Services
{
    public interface ICriticalValueService
    {
        Task CheckAndCreateCriticalAlertAsync(Guid resultId);
        Task AcknowledgeAlertAsync(Guid alertId, Guid userId, AcknowledgeAlertRequestDto ackDto);
        Task EscalateAlertAsync(Guid alertId);
        Task CheckAndEscalatePendingAlertsAsync();
        Task<IEnumerable<CriticalAlertSummaryDto>> GetAlertsByStatusAsync(string status, int limit);
        Task<CriticalAlertDetailDto?> GetAlertDetailsAsync(Guid alertId);
    }
}
