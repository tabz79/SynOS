using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SynOS.Services.Dev
{
    public interface IDevWorkflowSimulator
    {
        Task<SimulateDevStateResponse> SimulateToStateAsync(SimulateDevStateRequest request);
    }

    public class SimulateDevStateRequest
    {
        public string TargetState { get; set; } = "READY_FOR_VERIFICATION";
        public string? TestCode { get; set; } // Optional: e.g. "LFT", "CBC"
    }

    public class SimulateDevStateResponse
    {
        public Guid? ReportId { get; set; }
        public string TargetState { get; set; } = string.Empty;
        public List<SimulationLogEntry> Logs { get; set; } = new List<SimulationLogEntry>();
    }

    public class SimulationLogEntry
    {
        public string Stage { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
