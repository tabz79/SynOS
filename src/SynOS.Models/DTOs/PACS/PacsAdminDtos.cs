using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.PACS
{
    public sealed class PacsOrphanSummaryDto
    {
        public int InstancesMissingFiles { get; set; }
        public int InstancesWithMissingStudy { get; set; }
        public int SeriesWithNoInstances { get; set; }
    }

    public sealed class PacsStorageStatsDto
    {
        public long TotalBytes { get; set; }
        public int TotalStudies { get; set; }
        public int TotalSeries { get; set; }
        public int TotalInstances { get; set; }
        public IReadOnlyList<PacsOrgBranchStatsDto> ByOrgBranch { get; set; } = Array.Empty<PacsOrgBranchStatsDto>();
    }

    public sealed class PacsOrgBranchStatsDto
    {
        public Guid OrgId { get; set; }
        public Guid BranchId { get; set; }
        public long TotalBytes { get; set; }
        public int Studies { get; set; }
        public int Series { get; set; }
        public int Instances { get; set; }
    }
}
