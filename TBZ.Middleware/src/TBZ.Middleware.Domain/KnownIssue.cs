using System;

namespace TBZ.Middleware.Domain
{
    public class KnownIssue
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string DiagnosticFingerprint { get; set; } = string.Empty;
        public string RootCause { get; set; } = string.Empty;
        public string Workaround { get; set; } = string.Empty;
        public string FixedVersion { get; set; } = string.Empty;
        public string AffectedVersions { get; set; } = string.Empty;
        public string ResolutionPackage { get; set; } = string.Empty;
    }
}
