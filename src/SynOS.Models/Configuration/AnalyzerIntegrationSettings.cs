using System;
using System.Collections.Generic;

namespace SynOS.Models.Configuration
{
    public class AnalyzerIntegrationSettings
    {
        public List<AnalyzerListenerConfig> Listeners { get; set; } = new List<AnalyzerListenerConfig>();
    }

    public class AnalyzerListenerConfig
    {
        public Guid AnalyzerId { get; set; }
        public string Protocol { get; set; } = null!; // ASTM, HL7
        public int Port { get; set; }
    }
}
