using System;
using SynOS.Models.Enums;

namespace SynOS.Models.DTOs.Processing
{
    public class ProcessingQueueItemDto
    {
        public Guid ProcessingAssignmentId { get; set; }
        public Guid SpecimenId { get; set; }
        public string AccessionNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string TestName { get; set; } = string.Empty;
        public string SpecimenTypeCode { get; set; } = string.Empty;
        public string Priority { get; set; } = "Routine";
        public string DepartmentCode { get; set; } = string.Empty;
        public ProcessingAssignmentStatus Status { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? StartedAt { get; set; }
        public Guid? AssignedResourceId { get; set; }
        public string? AssignedTechnicianName { get; set; }
    }
}
