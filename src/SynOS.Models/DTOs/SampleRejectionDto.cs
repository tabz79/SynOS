using System;

namespace SynOS.Models.DTOs
{
    public class SampleRejectionDto
    {
        public Guid RejectionId { get; set; }
        public Guid SampleId { get; set; }
        public string Reason { get; set; } = string.Empty;
        public bool RequiresRecollection { get; set; }
        public Guid? NewSampleId { get; set; }
        public string RejectedBy { get; set; } = string.Empty;
        public DateTime RejectedAt { get; set; }
    }
}
