using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class PartnerProfileService
    {
        private readonly MiddlewareDbContext _db;

        public PartnerProfileService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<ReferralPartnerProfileDto?> GetPartnerProfileAsync(string labId, Guid partnerId)
        {
            // 1. Get Partner Metadata from ReferralPartnerFacts
            var partnerFact = await _db.ReferralPartnerFacts
                .Where(f => f.LabId == labId && f.ReferralPartnerId == partnerId.ToString())
                .OrderByDescending(f => f.Date)
                .FirstOrDefaultAsync();

            string partnerName = partnerFact?.ReferralPartnerName ?? "Unknown Partner";
            string partnerLocation = partnerFact?.ReferralPartnerLocation ?? "Unknown Location";

            // 2. Fetch referred patients and visits
            var patients = await _db.PatientIntelligenceFacts
                .Where(f => f.LabId == labId && f.ReferralPartnerId == partnerId)
                .ToListAsync();

            var visits = await _db.PatientVisitFacts
                .Where(v => v.LabId == labId && v.ReferralPartnerId == partnerId)
                .OrderByDescending(v => v.VisitDate)
                .ToListAsync();

            if (patients.Count == 0 && visits.Count == 0 && partnerFact == null)
            {
                return null;
            }

            var today = DateTime.UtcNow;

            // 3. Compute Summary Metrics
            decimal totalRevenue = visits.Sum(v => v.AmountPaid);
            int totalVisitsCount = visits.Count;
            decimal averageBill = totalVisitsCount > 0 ? totalRevenue / totalVisitsCount : 0m;

            int repeatPatients = patients.Count(p => p.TotalVisits > 1);
            int firstTimePatients = patients.Count(p => p.TotalVisits == 1);

            DateTime? lastActivity = visits.Select(v => (DateTime?)v.VisitDate).FirstOrDefault();
            int? daysSinceLastReferral = lastActivity.HasValue ? (today - lastActivity.Value).Days : null;

            int activePatientsCount = patients.Count(p => p.LastVisitDate.HasValue && p.LastVisitDate.Value >= today.AddDays(-90));
            int inactivePatientsCount = patients.Count(p => p.LastVisitDate.HasValue && p.LastVisitDate.Value < today.AddDays(-90));

            // Average days between referrals
            double avgDaysBetweenReferrals = 0;
            if (visits.Count > 1)
            {
                var chronVisits = visits.Select(v => v.VisitDate).OrderBy(d => d).ToList();
                double totalDaysDiff = 0;
                for (int i = 1; i < chronVisits.Count; i++)
                {
                    totalDaysDiff += (chronVisits[i] - chronVisits[i - 1]).TotalDays;
                }
                avgDaysBetweenReferrals = totalDaysDiff / (chronVisits.Count - 1);
            }

            // Highest value patient
            var highestValPatient = patients.OrderByDescending(p => p.LifetimeRevenue).FirstOrDefault();
            string highestValPatientName = highestValPatient?.PatientName ?? "N/A";
            decimal highestValPatientRevenue = highestValPatient?.LifetimeRevenue ?? 0m;

            // Most recent patient
            var mostRecentVisit = visits.FirstOrDefault();
            string mostRecentPatientName = "N/A";
            DateTime? mostRecentPatientDate = null;
            if (mostRecentVisit != null)
            {
                var patientOfVisit = patients.FirstOrDefault(p => p.PatientId == mostRecentVisit.PatientId);
                mostRecentPatientName = patientOfVisit?.PatientName ?? "Unknown Patient";
                mostRecentPatientDate = mostRecentVisit.VisitDate;
            }

            var summary = new PartnerSummaryDto
            {
                PartnerId = partnerId,
                PartnerName = partnerName,
                PartnerLocation = partnerLocation,
                Revenue = totalRevenue,
                Patients = patients.Count,
                AverageBill = averageBill,
                RepeatPatients = repeatPatients,
                FirstTimePatients = firstTimePatients,
                LastActivity = lastActivity,
                DaysSinceLastReferral = daysSinceLastReferral,
                TotalUniquePatients = patients.Count,
                ActivePatientsLast90Days = activePatientsCount,
                InactivePatients90PlusDays = inactivePatientsCount,
                AverageDaysBetweenReferrals = Math.Round(avgDaysBetweenReferrals, 1),
                HighestValuePatientName = highestValPatientName,
                HighestValuePatientRevenue = highestValPatientRevenue,
                MostRecentPatientName = mostRecentPatientName,
                MostRecentPatientDate = mostRecentPatientDate
            };

            // 4. Compute Trends by Month
            var visitsByMonth = visits
                .GroupBy(v => v.VisitDate.ToString("yyyy-MM"))
                .OrderBy(g => g.Key)
                .ToList();

            var monthlyRevenueTrend = visitsByMonth.Select(g => new MonthlyTrendDto
            {
                Month = g.Key,
                Value = g.Sum(v => v.AmountPaid)
            }).ToList();

            var monthlyPatientTrend = visitsByMonth.Select(g => new MonthlyTrendDto
            {
                Month = g.Key,
                Value = g.Select(v => v.PatientId).Distinct().Count()
            }).ToList();

            var averageBillTrend = visitsByMonth.Select(g => new MonthlyTrendDto
            {
                Month = g.Key,
                Value = g.Count() > 0 ? g.Sum(v => v.AmountPaid) / g.Count() : 0m
            }).ToList();

            // 5. Gender Distribution
            var genderDistribution = patients
                .GroupBy(p => string.IsNullOrEmpty(p.Gender) ? "Unknown" : p.Gender)
                .ToDictionary(g => g.Key, g => g.Count());

            // 6. Age Distribution
            var ageBuckets = new Dictionary<string, int>
            {
                { "0-18", 0 },
                { "19-35", 0 },
                { "36-50", 0 },
                { "51-65", 0 },
                { "66+", 0 }
            };
            foreach (var p in patients)
            {
                int age = 0;
                if (p.DateOfBirth.HasValue)
                {
                    age = today.Year - p.DateOfBirth.Value.Year;
                    if (p.DateOfBirth.Value.Date > today.AddYears(-age)) age--;
                }

                if (age <= 18) ageBuckets["0-18"]++;
                else if (age <= 35) ageBuckets["19-35"]++;
                else if (age <= 50) ageBuckets["36-50"]++;
                else if (age <= 65) ageBuckets["51-65"]++;
                else ageBuckets["66+"]++;
            }

            // 7. Top Tests and Frequencies
            var testCounts = new Dictionary<string, int>();
            foreach (var v in visits)
            {
                try
                {
                    if (!string.IsNullOrEmpty(v.TestsJson))
                    {
                        var list = JsonSerializer.Deserialize<List<string>>(v.TestsJson);
                        if (list != null)
                        {
                            foreach (var t in list)
                            {
                                if (!testCounts.ContainsKey(t)) testCounts[t] = 0;
                                testCounts[t]++;
                            }
                        }
                    }
                }
                catch
                {
                    // Ignore parse errors
                }
            }

            var topTests = testCounts
                .OrderByDescending(kv => kv.Value)
                .Select(kv => new TestCountDto { TestCode = kv.Key, Count = kv.Value })
                .ToList();

            // 8. Top 10 Patients by Revenue
            var top10Patients = patients
                .OrderByDescending(p => p.LifetimeRevenue)
                .Take(10)
                .Select(p => new PatientRevenueSummaryDto
                {
                    PatientId = p.PatientId,
                    PatientName = p.PatientName,
                    Revenue = p.LifetimeRevenue
                })
                .ToList();

            // 9. Complete Patient Directory
            var patientDirectory = new List<ReferredPatientDto>();
            foreach (var p in patients)
            {
                int age = 0;
                if (p.DateOfBirth.HasValue)
                {
                    age = today.Year - p.DateOfBirth.Value.Year;
                    if (p.DateOfBirth.Value.Date > today.AddYears(-age)) age--;
                }

                // Get last tests from their most recent visit
                var lastVisit = visits.Where(v => v.PatientId == p.PatientId).OrderByDescending(v => v.VisitDate).FirstOrDefault();
                string lastTests = string.Empty;
                if (lastVisit != null)
                {
                    try
                    {
                        if (!string.IsNullOrEmpty(lastVisit.TestsJson))
                        {
                            var list = JsonSerializer.Deserialize<List<string>>(lastVisit.TestsJson);
                            if (list != null) lastTests = string.Join(", ", list);
                        }
                    }
                    catch
                    {
                    }
                }

                patientDirectory.Add(new ReferredPatientDto
                {
                    PatientId = p.PatientId,
                    MRN = p.MRN,
                    PatientName = p.PatientName,
                    MobileNumber = p.MobileNumber,
                    Age = age,
                    Gender = p.Gender,
                    TotalVisits = p.TotalVisits,
                    LifetimeRevenue = p.LifetimeRevenue,
                    FirstVisit = p.FirstVisitDate,
                    LastVisit = p.LastVisitDate,
                    LastTestsOrdered = lastTests
                });
            }

            // 10. Recent Timeline
            var recentTimeline = new List<ReferredVisitDto>();
            foreach (var v in visits)
            {
                var patientNameOfVisit = patients.FirstOrDefault(p => p.PatientId == v.PatientId)?.PatientName ?? "Unknown Patient";
                var tests = new List<string>();
                try
                {
                    if (!string.IsNullOrEmpty(v.TestsJson))
                    {
                        tests = JsonSerializer.Deserialize<List<string>>(v.TestsJson) ?? new List<string>();
                    }
                }
                catch
                {
                }

                recentTimeline.Add(new ReferredVisitDto
                {
                    VisitDate = v.VisitDate,
                    PatientName = patientNameOfVisit,
                    TestsOrdered = tests,
                    AmountPaid = v.AmountPaid
                });
            }

            return new ReferralPartnerProfileDto
            {
                Summary = summary,
                MonthlyRevenueTrend = monthlyRevenueTrend,
                MonthlyPatientTrend = monthlyPatientTrend,
                AverageBillTrend = averageBillTrend,
                GenderDistribution = genderDistribution,
                AgeDistribution = ageBuckets,
                TopTests = topTests,
                Top10PatientsByRevenue = top10Patients,
                CompletePatientDirectory = patientDirectory,
                RecentPatientTimeline = recentTimeline
            };
        }
    }
}
