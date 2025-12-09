namespace SynOS.Models.Enums
{
    public static class LabAnalyzerResultStatus
    {
        public const string Pending = "Pending";
        public const string Matched = "Matched";
        public const string Rejected = "Rejected"; // For future use
        public const string Imported = "Imported"; // For future use
        public const string ParseError = "ParseError";
    }
}
