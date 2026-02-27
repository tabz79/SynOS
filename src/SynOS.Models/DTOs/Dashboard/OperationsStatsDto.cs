namespace SynOS.Models.DTOs.Dashboard
{
    public class OperationsStatsDto
    {
        public int? PendingReports { get; set; }
        public double? AvgReportTimeMinutes { get; set; }
        
        // Phlebotomy Stats
        public int? PendingCollections { get; set; }
        public int? CompletedCollections { get; set; }
        public int? TestsRunning { get; set; }
    }
}