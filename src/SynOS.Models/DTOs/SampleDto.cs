using System;
using SynOS.Models.Entities;

namespace SynOS.Models.DTOs
{
    public class SampleDto
    {
        public Guid SampleId { get; set; }
        public Guid OrderId { get; set; }
        public string TubeType { get; set; } = string.Empty;
        public string Barcode { get; set; } = string.Empty;
        public DateTime? CollectedAt { get; set; }
        public string? CollectedBy { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsRejected { get; set; }
        public Guid VisitId { get; set; } // For context
        public Guid BranchId { get; set; } // ADDED: Required for branch-scoped SignalR isolation
        public string PatientName { get; set; } = string.Empty; // For context
        public string TestName { get; set; } = string.Empty; // For context
        public string TokenNumber { get; set; } = string.Empty; // For context
    }
}
