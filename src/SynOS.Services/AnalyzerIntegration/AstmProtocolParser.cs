using System;
using System.Linq;
using Microsoft.Extensions.Logging;
using SynOS.Models.Entities;

namespace SynOS.Services.AnalyzerIntegration
{
    public class AstmProtocolParser : IAnalyzerProtocolParser
    {
        private readonly ILogger<AstmProtocolParser> _logger;

        public AstmProtocolParser(ILogger<AstmProtocolParser> logger)
        {
            _logger = logger;
        }

        public AnalyzerParsedResult Parse(string rawMessage)
        {
            var result = new AnalyzerParsedResult { RawMessage = rawMessage };

            try
            {
                // ASTM messages often contain multiple lines (segments)
                // Normalize carriage returns and line feeds to support standard \r\n as well as classical RS-232 \r-only
                var normalized = rawMessage.Replace("\r\n", "\n").Replace('\r', '\n');
                var segments = normalized.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                                         .Select(s => s.Trim())
                                         .ToList();

                // Find result segments (R-segments)
                var rSegments = segments.Where(s => s.StartsWith("R|")).ToList();
                if (!rSegments.Any())
                {
                    result.ErrorMessage = "No R-segment found in ASTM message.";
                    _logger.LogWarning("ASTM parsing failed: {ErrorMessage}", result.ErrorMessage);
                    return result;
                }

                // Patient Identifier (from P-segment, if available)
                var pSegment = segments.FirstOrDefault(s => s.StartsWith("P|"));
                if (pSegment != null)
                {
                    var pFields = pSegment.Split('|');
                    // Look for Patient ID in P|3 (Patient ID segment) or P|2
                    if (pFields.Length > 2)
                    {
                        result.PatientIdentifier = pFields.Length > 3 && !string.IsNullOrWhiteSpace(pFields[3])
                            ? pFields[3].Split('^').FirstOrDefault()?.Trim()
                            : pFields[2].Split('^').FirstOrDefault()?.Trim();
                    }
                }

                // Extract all R-segments
                foreach (var rSeg in rSegments)
                {
                    var rFields = rSeg.Split('|');
                    if (rFields.Length > 3)
                    {
                        var item = new AnalyzerParsedResultItem
                        {
                            AnalyzerTestCode = rFields[2].Split('^').LastOrDefault()?.Trim(),
                            Value = rFields[3]?.Trim(),
                            Units = rFields.Length > 4 ? rFields[4]?.Trim() : null,
                            Flags = rFields.Length > 5 ? rFields[5]?.Trim() : null
                        };

                        result.SubResults.Add(item);

                        // If primary result fields aren't populated yet, set them to the first item for backwards compatibility
                        if (string.IsNullOrEmpty(result.AnalyzerTestCode))
                        {
                            result.AnalyzerTestCode = item.AnalyzerTestCode;
                            result.Value = item.Value;
                            result.Units = item.Units;
                            result.Flags = item.Flags;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                result.ErrorMessage = $"Exception during ASTM parsing: {ex.Message}";
                _logger.LogError(ex, "ASTM parsing encountered an exception.");
            }

            return result;
        }
    }
}
