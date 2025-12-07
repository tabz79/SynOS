using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class RadiologyStudyWorklistDto
    {
        public Guid VisitId { get; set; }
        public string TokenNumber { get; set; }
        public string PatientName { get; set; }
        public int PatientAge { get; set; }
        public string PatientGender { get; set; }
        public List<RadiologyStudyWorklistItemDto> Studies { get; set; } = new List<RadiologyStudyWorklistItemDto>();
    }

    public class RadiologyStudyWorklistItemDto
    {
        public Guid StudyId { get; set; }
        public string TestName { get; set; }
        public string Modality { get; set; }
        public string StudyStatus { get; set; }
        public bool HasReport { get; set; }
        public string ReportStatus { get; set; }
        public bool HasAttachments { get; set; }
        public string? ExternalSystemName { get; set; }
        public string? ExternalAccessionNumber { get; set; }
        public string? ExternalViewerUrl { get; set; }
    }
}
