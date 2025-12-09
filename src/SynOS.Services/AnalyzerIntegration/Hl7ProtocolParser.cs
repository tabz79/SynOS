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
                var segments = rawMessage.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                                         .Select(s => s.TrimEnd('\r')) // Remove carriage return
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

                // Extract result from OBX segment
                var obxSegment = segments.FirstOrDefault(s => s.StartsWith("OBX|"));
                if (obxSegment == null)
                {
                    result.ErrorMessage = "No OBX segment found in HL7 message.";
                    _logger.LogWarning("HL7 parsing failed: {ErrorMessage}", result.ErrorMessage);
                    return result;
                }

                var obxFields = obxSegment.Split('|');

                // OBX|1|NM|HGB^Hemoglobin||13.1|g/dL|N||
                if (obxFields.Length > 4)
                {
                    result.AnalyzerTestCode = obxFields[3].Split('^').FirstOrDefault(); // OBX-3.1
                    result.Value = obxFields[5]; // OBX-5
                }
                if (obxFields.Length > 6)
                {
                    result.Units = obxFields[6]; // OBX-6
                }
                if (obxFields.Length > 8)
                {
                    result.Flags = obxFields[8]; // OBX-8
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