using System;
using System.Linq;
using Microsoft.Extensions.Logging;

namespace SynOS.Services.AnalyzerIntegration
{
    public class Hl7ProtocolParser : IAnalyzerProtocolParser
    {
        private readonly ILogger<Hl7ProtocolParser> _logger;

        public Hl7ProtocolParser(ILogger<Hl7ProtocolParser> logger)
        {
            _logger = logger;
        }

        public AnalyzerParsedResult Parse(string rawMessage)
        {
            var result = new AnalyzerParsedResult { RawMessage = rawMessage };

            try
            {
                var normalized = rawMessage.Replace("\r\n", "\n").Replace('\r', '\n');
                var segments = normalized.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                                         .Select(s => s.Trim())
                                         .ToList();

                // Extract Patient Identifier from PID segment
                var pidSegment = segments.FirstOrDefault(s => s.StartsWith("PID|"));
                if (pidSegment != null)
                {
                    var pidFields = pidSegment.Split('|');
                    if (pidFields.Length > 3)
                    {
                        // PID|1||MRN123^^^SYN_MRN^MRN_Type|
                        result.PatientIdentifier = pidFields[3].Split('^').FirstOrDefault(); // Assuming MRN is first component
                    }
                }

                // Extract results from all OBX segments
                var obxSegments = segments.Where(s => s.StartsWith("OBX|")).ToList();
                if (!obxSegments.Any())
                {
                    result.ErrorMessage = "No OBX segment found in HL7 message.";
                    _logger.LogWarning("HL7 parsing failed: {ErrorMessage}", result.ErrorMessage);
                    return result;
                }

                foreach (var obxSeg in obxSegments)
                {
                    var obxFields = obxSeg.Split('|');
                    if (obxFields.Length > 5)
                    {
                        var item = new AnalyzerParsedResultItem
                        {
                            AnalyzerTestCode = obxFields[3].Split('^').FirstOrDefault()?.Trim(),
                            Value = obxFields[5]?.Trim(),
                            Units = obxFields.Length > 6 ? obxFields[6]?.Trim() : null,
                            Flags = obxFields.Length > 8 ? obxFields[8]?.Trim() : null
                        };

                        result.SubResults.Add(item);

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
                result.ErrorMessage = $"Exception during HL7 parsing: {ex.Message}";
                _logger.LogError(ex, "HL7 parsing encountered an exception.");
            }

            return result;
        }
    }
}