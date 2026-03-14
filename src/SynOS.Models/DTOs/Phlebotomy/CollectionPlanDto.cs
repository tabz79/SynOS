using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.Phlebotomy
{
    public class CollectionPlanDto
    {
        public Guid VisitId { get; set; }
        public Guid AssignmentId { get; set; }
        public PhlebotomyPatientDto Patient { get; set; } = null!;
        public List<CollectionInstructionDto> Instructions { get; set; } = new();
    }

    public class PhlebotomyPatientDto
    {
        public Guid PatientId { get; set; }
        public string MRN { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Sex { get; set; } = string.Empty;
    }

    public class CollectionInstructionDto
    {
        public string TubeCode { get; set; } = string.Empty;
        public string TubeName { get; set; } = string.Empty;
        public string TubeColor { get; set; } = string.Empty; // ADDED
        public string SpecimenTypeCode { get; set; } = string.Empty;
        public string SpecimenName { get; set; } = string.Empty; // ADDED
        public int RequiredTubes { get; set; } = 1;
        public string? AccessionNumber { get; set; }
        public int? Sequence { get; set; }
        public List<PlannedTestDto> Tests { get; set; } = new();
    }

    public class PlannedTestDto
    {
        public Guid OrderId { get; set; }
        public string TestCode { get; set; } = string.Empty;
        public string TestName { get; set; } = string.Empty;
    }
}
