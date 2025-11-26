namespace SynOS.Models.DTOs
{
    public class ReportSignRequestDto
    {
        public string? PathologistComments { get; set; }
        public string? Interpretation { get; set; }
        public string? Recommendations { get; set; }
        public bool ConfirmCriticalValuesReviewed { get; set; } = false;
    }
}
