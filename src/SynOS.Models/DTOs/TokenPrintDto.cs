using System;

namespace SynOS.Models.DTOs
{
    public class TokenPrintDto
    {
        public string Token { get; set; } = string.Empty;
        public string MRN { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public DateTime VisitTime { get; set; }
    }
}
