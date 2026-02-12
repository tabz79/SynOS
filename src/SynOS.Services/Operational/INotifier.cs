using System;
using System.Threading.Tasks;

namespace SynOS.Services.Operational
{
    public interface INotifier 
    {
        Task NotifyDashboardRefresh(string branchId);
    }
}
