using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.Phlebotomy
{
    public class CollectAssignmentRequest
    {
        public Guid? AssignmentId { get; set; }
        public Guid? VisitId { get; set; }
        public string? Notes { get; set; }
    }
}
