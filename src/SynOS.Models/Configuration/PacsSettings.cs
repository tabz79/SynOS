namespace SynOS.Models.Configuration
{
    public class PacsSettings
    {
        public string RootPath { get; set; }
        public int MaxInstancesPerSeriesInSeriesTree { get; set; } = 5000;
        public int MaxTotalInstancesPerStudyInSeriesTree { get; set; } = 20000;
    }
}
