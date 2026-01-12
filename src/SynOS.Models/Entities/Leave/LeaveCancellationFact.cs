using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Leave
{
    public class LeaveCancellationFact
    {
        [Key]
        public Guid LeaveCancellationFactId { get; set; }
        public Guid OriginalLeaveFactId { get; set; }
        public Guid AuthorId { get; set; } // Non-nullable as per design
        public DateTime RecordedTimestamp { get; set; } // When the cancellation was recorded
    }
}