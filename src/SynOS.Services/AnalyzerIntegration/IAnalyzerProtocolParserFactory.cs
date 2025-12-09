using System;

namespace SynOS.Services.AnalyzerIntegration
{
    public interface IAnalyzerProtocolParserFactory
    {
        IAnalyzerProtocolParser GetParser(string protocolType);
    }
}
