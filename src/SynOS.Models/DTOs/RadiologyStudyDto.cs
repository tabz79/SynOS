using System;

namespace SynOS.Models.DTOs
{
    public class RadiologyStudyDto
    {
        public Guid RadiologyStudyId { get; set; }
        public Guid VisitId { get; set; }
        public Guid OrderId { get; set; }
        public string TestName { get; set; }
        public string Modality { get; set; }
        public string Status { get; set; }
    }
}