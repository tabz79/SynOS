using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class ReferralService
    {
        private readonly MiddlewareDbContext _db;

        public ReferralService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<ReferralsSummaryDto> GetAsync(string resolvedLabId, DateTime? startDate, DateTime? endDate)
        {
            var isAll = string.IsNullOrEmpty(resolvedLabId) || resolvedLabId.Equals("ALL", StringComparison.OrdinalIgnoreCase);

            // 1. Query DoctorReferralFacts
            var docQuery = _db.DoctorReferralFacts.AsQueryable();
            if (!isAll)
            {
                docQuery = docQuery.Where(f => f.LabId == resolvedLabId);
            }
            if (startDate.HasValue)
            {
                docQuery = docQuery.Where(f => f.Date >= startDate.Value.Date);
            }
            if (endDate.HasValue)
            {
                docQuery = docQuery.Where(f => f.Date <= endDate.Value.Date);
            }

            var rawDoctors = await docQuery.ToListAsync();

            // 2. Query PatientVisitFacts for live visit aggregates
            var visitQuery = _db.PatientVisitFacts.AsQueryable();
            if (!isAll)
            {
                visitQuery = visitQuery.Where(v => v.LabId == resolvedLabId);
            }
            if (startDate.HasValue)
            {
                visitQuery = visitQuery.Where(v => v.VisitDate >= startDate.Value.Date);
            }
            if (endDate.HasValue)
            {
                visitQuery = visitQuery.Where(v => v.VisitDate <= endDate.Value.Date);
            }

            var rawVisits = await visitQuery.ToListAsync();

            // Group visits by referring doctor
            var visitDoctorGroups = rawVisits
                .Where(v => !string.IsNullOrWhiteSpace(v.ReferringDoctorOrPartner))
                .GroupBy(v => v.ReferringDoctorOrPartner.Trim())
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        PatientCount = g.Select(x => x.PatientId).Distinct().Count(),
                        Revenue = g.Sum(x => x.AmountPaid),
                        Commission = g.Sum(x => x.CommissionAmount),
                        LastDate = g.Max(x => x.VisitDate),
                        Location = g.Where(x => !string.IsNullOrEmpty(x.Location) && x.Location != "Local Area")
                                    .GroupBy(x => x.Location)
                                    .OrderByDescending(x => x.Count())
                                    .Select(x => x.Key)
                                    .FirstOrDefault() ?? "Local Area"
                    }
                );

            // Merge facts
            var doctorDict = new Dictionary<string, DoctorReferralSummaryDto>(StringComparer.OrdinalIgnoreCase);

            foreach (var fact in rawDoctors)
            {
                var docName = string.IsNullOrWhiteSpace(fact.DoctorName) ? "Self-Referral" : fact.DoctorName.Trim();
                if (!doctorDict.TryGetValue(docName, out var dto))
                {
                    dto = new DoctorReferralSummaryDto
                    {
                        DoctorId = fact.DoctorId,
                        DoctorName = docName,
                        PatientCount = 0,
                        RevenueGenerated = 0,
                        CommissionEarned = 0,
                        TestCount = 0
                    };
                    doctorDict[docName] = dto;
                }
                dto.PatientCount += fact.PatientCount;
                dto.RevenueGenerated += fact.RevenueGenerated;
                dto.CommissionEarned += fact.CommissionEarned;
                dto.TestCount += fact.TestCount;
                if (string.IsNullOrEmpty(dto.LastReferralDate) || string.Compare(fact.Date.ToString("yyyy-MM-dd"), dto.LastReferralDate) > 0)
                {
                    dto.LastReferralDate = fact.Date.ToString("yyyy-MM-dd");
                }
            }

            // Overlay or add data from visits to ensure 100% accuracy
            foreach (var kvp in visitDoctorGroups)
            {
                var docName = kvp.Key;
                var info = kvp.Value;

                if (!doctorDict.TryGetValue(docName, out var dto))
                {
                    dto = new DoctorReferralSummaryDto
                    {
                        DoctorId = docName,
                        DoctorName = docName,
                        Location = info.Location,
                        PatientCount = info.PatientCount,
                        RevenueGenerated = info.Revenue,
                        CommissionEarned = info.Commission,
                        LastReferralDate = info.LastDate.ToString("yyyy-MM-dd")
                    };
                    doctorDict[docName] = dto;
                }
                else
                {
                    // If visits has more precise data, use the maximums/latest
                    if (info.PatientCount > dto.PatientCount) dto.PatientCount = info.PatientCount;
                    if (info.Revenue > dto.RevenueGenerated) dto.RevenueGenerated = info.Revenue;
                    if (info.Commission > dto.CommissionEarned) dto.CommissionEarned = info.Commission;
                    if (string.IsNullOrEmpty(dto.Location) || dto.Location == "Local Area") dto.Location = info.Location;
                    var visitDateStr = info.LastDate.ToString("yyyy-MM-dd");
                    if (string.Compare(visitDateStr, dto.LastReferralDate) > 0) dto.LastReferralDate = visitDateStr;
                }
            }

            foreach (var doc in doctorDict.Values)
            {
                doc.AverageBill = doc.PatientCount > 0 ? Math.Round(doc.RevenueGenerated / doc.PatientCount, 2) : 0;
            }

            var doctors = doctorDict.Values
                .OrderByDescending(x => x.RevenueGenerated)
                .ToList();

            // 3. Referral Partners
            var partnerQuery = _db.ReferralPartnerFacts.AsQueryable();
            if (!isAll)
            {
                partnerQuery = partnerQuery.Where(f => f.LabId == resolvedLabId);
            }
            if (startDate.HasValue)
            {
                partnerQuery = partnerQuery.Where(f => f.Date >= startDate.Value.Date);
            }
            if (endDate.HasValue)
            {
                partnerQuery = partnerQuery.Where(f => f.Date <= endDate.Value.Date);
            }

            var rawPartners = await partnerQuery.ToListAsync();
            var partners = rawPartners
                .GroupBy(f => new { f.ReferralPartnerId, f.ReferralPartnerName, f.ReferralPartnerLocation })
                .Select(g => new ReferralPartnerSummaryDto
                {
                    PartnerId = g.Key.ReferralPartnerId,
                    PartnerName = g.Key.ReferralPartnerName,
                    PartnerLocation = g.Key.ReferralPartnerLocation,
                    PatientCount = g.Sum(x => x.PatientCount),
                    RevenueGenerated = g.Sum(x => x.RevenueGenerated),
                    CommissionEarned = g.Sum(x => x.CommissionEarned),
                    AverageBill = g.Sum(x => x.PatientCount) > 0 ? Math.Round(g.Sum(x => x.RevenueGenerated) / g.Sum(x => x.PatientCount), 2) : 0,
                    TestCount = g.Sum(x => x.TestCount),
                    LastReferralDate = g.Max(x => x.Date).ToString("yyyy-MM-dd")
                })
                .OrderByDescending(x => x.RevenueGenerated)
                .ToList();

            return new ReferralsSummaryDto { Doctors = doctors, Partners = partners };
        }
    }
}
