using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.PACS
{
    public sealed class PacsSeriesTreeDto
    {
        public Guid RadiologyStudyId { get; set; }
        public string StudyInstanceUid { get; set; } = default!;
        public IReadOnlyList<PacsSeriesNodeDto> Series { get; set; } = Array.Empty<PacsSeriesNodeDto>();
    }

    public sealed class PacsSeriesNodeDto
    {
        public Guid SeriesId { get; set; }
        public string SeriesInstanceUid { get; set; } = default!;
        public string? Modality { get; set; }
        public string? Description { get; set; }
        public int? SeriesNumber { get; set; }
        public int InstanceCount { get; set; }
        public IReadOnlyList<PacsInstanceNodeDto> Instances { get; set; } = Array.Empty<PacsInstanceNodeDto>();
    }

    public sealed class PacsInstanceNodeDto
    {
        public Guid InstanceId { get; set; }
        public string SopInstanceUid { get; set; } = default!;
        public int? InstanceNumber { get; set; }
        public int? FrameCount { get; set; }
        public string Wadouri { get; set; } = default!;
    }
}
