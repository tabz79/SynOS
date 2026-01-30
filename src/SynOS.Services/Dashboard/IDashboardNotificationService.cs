using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Dashboard;

namespace SynOS.Services.Dashboard
{
    public interface IDashboardNotificationService
    {
        Task NotifyReceptionSummaryUpdateAsync(string userId, TodaysSummaryDto summary);
        Task NotifyActionQueueUpdatedAsync(string userId);
    }
}