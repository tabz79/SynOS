using System;

namespace SynOS.Models.DTOs.Reception
{
    public class SetReferralRequestDto
    {
        public Guid VisitId { get; set; }
        public Guid ReferralPartnerId { get; set; }
    }
}
