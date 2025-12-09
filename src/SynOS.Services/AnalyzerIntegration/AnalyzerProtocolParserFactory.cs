using System;
using Microsoft.Extensions.DependencyInjection; // For IServiceProvider
using Microsoft.Extensions.Logging;
using SynOS.Models.Entities;
using SynOS.Models.Enums; // Added

namespace SynOS.Services.AnalyzerIntegration
{
    public class AnalyzerProtocolParserFactory : IAnalyzerProtocolParserFactory
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AnalyzerProtocolParserFactory> _logger;

        public AnalyzerProtocolParserFactory(IServiceProvider serviceProvider, ILogger<AnalyzerProtocolParserFactory> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        public IAnalyzerProtocolParser GetParser(string protocolType)
        {
            return protocolType switch
            {
                LabAnalyzerConnectionTypes.Astm => _serviceProvider.GetRequiredService<AstmProtocolParser>(),
                LabAnalyzerConnectionTypes.Hl7 => _serviceProvider.GetRequiredService<Hl7ProtocolParser>(),
                _ => throw new ArgumentException($"No parser registered for protocol type: {protocolType}")
            };
        }
    }
}
