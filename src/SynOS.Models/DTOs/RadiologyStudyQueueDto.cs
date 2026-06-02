using System;

namespace SynOS.Models.DTOs
{
    public class RadiologyStudyQueueDto
    {
        public Guid RadiologyStudyId { get; set; }
        public Guid VisitId { get; set; }
        public string TokenNumber { get; set; }
        public string PatientName { get; set; }
        public int PatientAge { get; set; }
        public string PatientGender { get; set; }
        public string TestName { get; set; }
        public string Modality { get; set; }
        public string Status { get; set; }
        public string AssignedToTechnicianName { get; set; }
        public Guid? ClaimedByUserId { get; set; }
        public string? ClaimedByUserName { get; set; }
        public DateTimeOffset? ClaimedAt { get; set; }
        public DateTimeOffset? LastActivityAt { get; set; }
        public Guid? ActiveSessionId { get; set; }
    }
}
