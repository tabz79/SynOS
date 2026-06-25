using System;

namespace TBZ.Middleware.Domain
{
    public class TestVolumeFact
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public DateTime Date { get; set; }

        public string TestCode { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;

        public int VolumeCount { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
