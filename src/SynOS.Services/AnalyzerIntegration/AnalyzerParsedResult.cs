using System;

namespace SynOS.Services.AnalyzerIntegration
{
    public class AnalyzerParsedResult
    {
        public Guid AnalyzerId { get; set; }

        public string? PatientIdentifier { get; set; } // MRN or Barcode
        public string? AnalyzerTestCode { get; set; }   // e.g. “HGB”
        public string? Value { get; set; }              // numeric as string
        public string? Units { get; set; }
        public string? Flags { get; set; }             // H/L/Critical
        public string RawMessage { get; set; } = null!; // Store original raw message
        public string? ErrorMessage { get; set; }      // To store parsing errors
    }
}
