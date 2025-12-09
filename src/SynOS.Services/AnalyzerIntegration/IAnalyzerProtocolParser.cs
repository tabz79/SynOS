using System;

namespace SynOS.Services.AnalyzerIntegration
{
    public interface IAnalyzerProtocolParser
    {
        AnalyzerParsedResult Parse(string rawMessage);
    }
}
