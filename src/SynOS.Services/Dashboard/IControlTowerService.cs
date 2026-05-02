using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Dashboard.ControlTower;

namespace SynOS.Services.Dashboard
{
    public interface IControlTowerService
    {
        Task<ControlTowerSummaryDto> GetFullDashboardAsync(Guid branchId);
    }
}
