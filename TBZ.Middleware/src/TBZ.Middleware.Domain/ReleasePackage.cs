using System;

namespace TBZ.Middleware.Domain
{
    public class ReleasePackage
    {
        public Guid Id { get; set; }
        public Guid ReleaseId { get; set; }
        public string TargetArchitecture { get; set; } = string.Empty;
        public string PackageFileName { get; set; } = string.Empty;
        public string ChecksumSha256 { get; set; } = string.Empty;
        public long RequiredFreeSpaceBytes { get; set; }
        public int SchemaVersion { get; set; }
        public string? Signature { get; set; }
        public string? SignatureAlgorithm { get; set; }
    }
}
