using System;

namespace SynOS.Models.Exceptions
{
    /// <summary>
    /// Exception thrown when a clinical report snapshot is missing, corrupted, 
    /// or otherwise fails integrity validation during a review or sign-off flow.
    /// This represents a hard block on diagnostic data access to prevent "Diagnostic Dissociation".
    /// </summary>
    public class SnapshotIntegrityException : Exception
    {
        public string Code { get; } = "SNAPSHOT_CORRUPTED";
        public Guid? ReportVersionId { get; }

        public SnapshotIntegrityException(string message, Guid? reportVersionId = null) 
            : base(message)
        {
            ReportVersionId = reportVersionId;
        }

        public SnapshotIntegrityException(string message, Exception innerException, Guid? reportVersionId = null) 
            : base(message, innerException)
        {
            ReportVersionId = reportVersionId;
        }
    }
}
