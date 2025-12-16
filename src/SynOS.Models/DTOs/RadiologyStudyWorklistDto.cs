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
        // Properties moved/added from RadiologyStudyWorklistItemDto are removed from here
        // as the nested DTO is the correct structure.

        public List<RadiologyStudyWorklistItemDto> Studies { get; set; } = new List<RadiologyStudyWorklistItemDto>();
    }

    public class RadiologyStudyWorklistItemDto
    {
        public Guid StudyId { get; set; }
        public string TestName { get; set; } // Uncommented
        public string Modality { get; set; } // Uncommented
        public string StudyStatus { get; set; } // Uncommented
        public bool HasReport { get; set; } // Uncommented
        public string ReportStatus { get; set; } // Uncommented
        public bool HasAttachments { get; set; } // Uncommented
        public string? ExternalSystemName { get; set; } // Uncommented
        public string? ExternalAccessionNumber { get; set; } // Uncommented
        public string? ExternalViewerUrl { get; set; } // Uncommented
    }
}
