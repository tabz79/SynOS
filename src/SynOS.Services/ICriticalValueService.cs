using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;

namespace SynOS.Services
{
    public interface ICriticalValueService
    {
        Task CheckAndCreateCriticalAlertAsync(Guid resultId);
        Task AcknowledgeAlertsForOrderAsync(Guid orderId, Guid userId, string notes);
        Task<IEnumerable<CriticalAlertSummaryDto>> GetAlertsByStatusAsync(string status, int limit);
        Task<CriticalAlertDetailDto?> GetAlertDetailsAsync(Guid alertId);
        Task<bool> HasPendingCriticalAlerts(Guid orderId);
    }
}
