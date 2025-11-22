using System;

namespace SynOS.Models.DTOs
{
    public class SampleBarcodePrintDto
    {
        public Guid SampleId { get; set; }
        public string PrintFormat { get; set; } = "ZPL";
        public string PrintPayload { get; set; } = string.Empty;
    }
}
