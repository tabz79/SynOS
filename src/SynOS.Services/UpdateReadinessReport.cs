using System;
using System.Collections.Generic;

namespace SynOS.Services
{
    public enum ReadinessSeverity
    {
        Success,
        Warning,
        Error
    }

    public class ReadinessCheck
    {
        public string Code { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public ReadinessSeverity Severity { get; set; }
    }

    public class UpdateReadinessReport
    {
        public bool CanInstall { get; set; } = true;
        public Guid? BackupId { get; set; }
        public List<ReadinessCheck> Checks { get; set; } = new List<ReadinessCheck>();
    }
}
