using System;
using System.Collections.Generic;

namespace SynOS.Services.AnalyzerIntegration
{
    public class AnalyzerParsedResultItem
    {
        public string? AnalyzerTestCode { get; set; }
        public string? Value { get; set; }
        public string? Units { get; set; }
        public string? Flags { get; set; }
    }

    public class AnalyzerParsedResult
    {
        public Guid AnalyzerId { get; set; }

        public string? PatientIdentifier { get; set; } // MRN or Barcode
        public string? AnalyzerTestCode { get; set; }   // Primary test code (e.g. “HGB”)
        public string? Value { get; set; }              // numeric as string
        public string? Units { get; set; }
        public string? Flags { get; set; }             // H/L/Critical
        public string RawMessage { get; set; } = null!; // Store original raw message
        public string? ErrorMessage { get; set; }      // To store parsing errors

        // Holds all extracted analytes for multi-analyte panels (e.g. CBC, CMP, LFT)
        public List<AnalyzerParsedResultItem> SubResults { get; set; } = new();
    }
}
