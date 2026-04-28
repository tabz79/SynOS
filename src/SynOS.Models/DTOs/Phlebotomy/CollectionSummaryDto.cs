using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.Phlebotomy
{
    public class CollectionSummaryDto
    {
        public Guid VisitId { get; set; }
        public PhlebotomyPatientDto Patient { get; set; } = null!;
        public List<CollectedSpecimenDto> Specimens { get; set; } = new();
        public DateTime? CollectedAt { get; set; }
        public string? CollectedByName { get; set; }
    }

    public class CollectedSpecimenDto
    {
        public Guid SpecimenId { get; set; }
        public string AccessionNumber { get; set; } = string.Empty;
        public string TubeName { get; set; } = string.Empty;
        public string SpecimenTypeName { get; set; } = string.Empty;
        public List<string> Tests { get; set; } = new();
        public string Status { get; set; } = string.Empty;
    }
}
