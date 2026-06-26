using System.Collections.Generic;

namespace TBZ.Middleware.Api.DTOs
{
    public class ReferralsSummaryDto
    {
        public List<DoctorReferralSummaryDto> Doctors { get; set; } = new List<DoctorReferralSummaryDto>();
        public List<ReferralPartnerSummaryDto> Partners { get; set; } = new List<ReferralPartnerSummaryDto>();
    }

    public class DoctorReferralSummaryDto
    {
        public string DoctorId { get; set; } = string.Empty;
        public string DoctorName { get; set; } = string.Empty;
        public int PatientCount { get; set; }
        public decimal RevenueGenerated { get; set; }
        public int TestCount { get; set; }
    }

    public class ReferralPartnerSummaryDto
    {
        public string PartnerId { get; set; } = string.Empty;
        public string PartnerName { get; set; } = string.Empty;
        public string PartnerLocation { get; set; } = string.Empty;
        public int PatientCount { get; set; }
        public decimal RevenueGenerated { get; set; }
        public int TestCount { get; set; }
    }
}
