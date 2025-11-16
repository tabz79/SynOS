using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class MergePreviewDto
    {
        public int VisitsToMove { get; set; }
        public int SamplesToMove { get; set; }
        public int PhoneHistoryToMove { get; set; }
        public int AliasesToMove { get; set; }
        public int ReferrerLinksToMove { get; set; }
    }
}
