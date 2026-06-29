using System;

namespace TBZ.Middleware.Domain
{
    public class NotificationTemplate
    {
        public Guid Id { get; set; }
        public string TemplateName { get; set; } = string.Empty;
        public int Version { get; set; } = 1;
        public string Language { get; set; } = "en";
        public string Category { get; set; } = "Utility";
        public bool Approved { get; set; } = true;
        public DateTime? LastSyncedFromMeta { get; set; }
        public string BodyPattern { get; set; } = string.Empty;
        public string VariableMappingsJson { get; set; } = "[]"; // Mapped ordered parameters list e.g. ["PatientName", "DownloadLink"]
    }
}
