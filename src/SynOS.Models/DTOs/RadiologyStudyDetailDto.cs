using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class RadiologyStudyDetailDto
    {
        // Study Info
        public Guid StudyId { get; set; }
        public Guid VisitId { get; set; }
        public string TestName { get; set; }
        public string Modality { get; set; }
        public string StudyStatus { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public string AssignedToTechnicianName { get; set; }

        // External System Info
        public string ExternalSystemName { get; set; }
        public string ExternalAccessionNumber { get; set; }
        public string ExternalViewerUrl { get; set; }

        // Patient Info
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public int PatientAge { get; set; }
        public string PatientGender { get; set; }
        public string TokenNumber { get; set; }

        // Report Info
        public RadiologyReportDto Report { get; set; } // This can be null if no draft exists

        // Attachments (deliverables)
        public List<ReportAttachmentDto> Attachments { get; set; } = new List<ReportAttachmentDto>();
        
        // Raw Images metadata (from RadiologyImages)
        public List<RadiologyImageDto> Images { get; set; } = new List<RadiologyImageDto>();

    }
}
