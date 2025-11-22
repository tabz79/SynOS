using System;

namespace SynOS.Models.DTOs
{
    public class VisitTokenPrintDto
    {
        public string Token { get; set; } = string.Empty;
        public PatientPrintDto Patient { get; set; } = new();
        public string Dept { get; set; } = string.Empty;
        public DateTime Time { get; set; }
        public string PrintFormat { get; set; } = "ESC/POS";
        public string PrintPayload { get; set; } = string.Empty;
    }
}
