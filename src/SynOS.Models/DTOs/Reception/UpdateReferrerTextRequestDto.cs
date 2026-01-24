using System;

namespace SynOS.Models.DTOs.Reception
{
    public class UpdateReferrerTextRequestDto
    {
        public Guid VisitId { get; set; }
        public string? ReferrerText { get; set; }
    }
}
