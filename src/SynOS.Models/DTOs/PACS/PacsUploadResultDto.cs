using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.PACS
{
    public sealed class PacsUploadResultDto
    {
        public Guid RadiologyStudyId { get; set; }
        public Guid SeriesId { get; set; }
        public int InstancesCreated { get; set; }
        public List<Guid> InstanceIds { get; set; } = new List<Guid>();
    }
}
