using System;

namespace SynOS.Models.DTOs.PACS
{
    public sealed class PacsReindexResultDto
    {
        public Guid RadiologyStudyId { get; set; }
        public int SeriesUpdated { get; set; }
        public int InstancesUpdated { get; set; }
        public int InstancesFailed { get; set; }
    }
}
