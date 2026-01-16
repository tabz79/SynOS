using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.ReadModels
{
    public class ProcessedProjectionEvent
    {
        public Guid EventId { get; set; }
        
        [StringLength(100)]
        public string ProjectionName { get; set; } = string.Empty;
        
        public DateTime ProcessedAt { get; set; }
    }
}