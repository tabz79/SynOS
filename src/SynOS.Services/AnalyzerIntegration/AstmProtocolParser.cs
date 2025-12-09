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
                var segments = rawMessage.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                                         .Select(s => s.TrimEnd('\r')) // Remove carriage return
                                         .ToList();

                // Find result segment (R-segment)
                var rSegment = segments.FirstOrDefault(s => s.StartsWith("R|"));
                if (rSegment == null)
                {
                    result.ErrorMessage = "No R-segment found in ASTM message.";
                    _logger.LogWarning("ASTM parsing failed: {ErrorMessage}", result.ErrorMessage);
                    return result;
                }

                var rFields = rSegment.Split('|');

                // Patient Identifier (from P-segment, if available)
                var pSegment = segments.FirstOrDefault(s => s.StartsWith("P|"));
                if (pSegment != null)
                {
                    var pFields = pSegment.Split('|');
                    // Assuming patient identifier is in P|1|1 (patient sequence number, could be MRN)
                    // Or P|1|||LAST^FIRST^MIDDLE. For now, let's try P|1|1
                    if (pFields.Length > 2)
                    {
                        // A common place for MRN is P|1|1 or P|3 in some variations
                        // For this basic implementation, let's look for Patient ID in P|3 (Patient ID segment)
                        // Example: P|1|MRN123^^^LabID
                        result.PatientIdentifier = pFields.Length > 2 ? pFields[2].Split('^').FirstOrDefault() : null;
                    }
                }

                // Extract result from R-segment
                // R|1|^^^HGB|12.8|g/dL|H|
                if (rFields.Length > 3)
                {
                    result.AnalyzerTestCode = rFields[2].Split('^').LastOrDefault(); // e.g., ^^^HGB -> HGB
                    result.Value = rFields[3];
                }
                if (rFields.Length > 4)
                {
                    result.Units = rFields[4];
                }
                if (rFields.Length > 5)
                {
                    result.Flags = rFields[5];
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
