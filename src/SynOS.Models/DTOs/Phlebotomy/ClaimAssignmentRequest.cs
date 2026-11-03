using System;

namespace SynOS.Models.DTOs.Phlebotomy
{
    public class ClaimAssignmentRequest
    {
        public Guid AssignmentId { get; set; }
        public Guid? VisitId { get; set; }
    }
}
