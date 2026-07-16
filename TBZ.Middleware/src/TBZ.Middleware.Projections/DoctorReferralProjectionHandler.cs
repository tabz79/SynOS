using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Projections
{
    public class DoctorReferralProjectionHandler : IProjectionHandler
    {
        public string ProjectionName => "DoctorReferral";

        public async Task ProjectEventAsync(StoredEvent storedEvent, MiddlewareDbContext db)
        {
            if (storedEvent.EventType == "ReleasedVisit")
            {
                try
                {
                    var dto = JsonSerializer.Deserialize<TBZ.Middleware.Domain.DTOs.ReleasedVisitDto>(storedEvent.PayloadJson);
                    if (dto == null) return;

                    var resolvedDoctorId = string.IsNullOrEmpty(dto.Referral.DoctorId.ToString()) || dto.Referral.DoctorId == Guid.Empty ? "Direct" : dto.Referral.DoctorId.ToString();
                    var resolvedDoctorName = resolvedDoctorId == "Direct" ? "Self-Referral" : (string.IsNullOrEmpty(dto.Referral.DoctorName) ? "Unknown Doctor" : dto.Referral.DoctorName);

                    var dateOnly = storedEvent.OccurredAt.Date;

                    var fact = db.DoctorReferralFacts.Local.FirstOrDefault(f =>
                        f.LabId == storedEvent.LabId &&
                        f.Date == dateOnly &&
                        f.DoctorId == resolvedDoctorId);

                    if (fact == null)
                    {
                        fact = await db.DoctorReferralFacts.FirstOrDefaultAsync(f =>
                            f.LabId == storedEvent.LabId &&
                            f.Date == dateOnly &&
                            f.DoctorId == resolvedDoctorId);
                    }

                    bool isNew = false;
                    if (fact == null)
                    {
                        isNew = true;
                        fact = new DoctorReferralFact
                        {
                            Id = Guid.NewGuid(),
                            LabId = storedEvent.LabId,
                            Date = dateOnly,
                            DoctorId = resolvedDoctorId,
                            DoctorName = resolvedDoctorName,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                    }
                    else
                    {
                        if (resolvedDoctorId != "Direct" && resolvedDoctorName != "Unknown Doctor" && fact.DoctorName != resolvedDoctorName)
                        {
                            fact.DoctorName = resolvedDoctorName;
                        }
                    }

                    fact.PatientCount++;
                    fact.RevenueGenerated += dto.Financials.PaidAmount;
                    fact.TestCount += dto.Investigations.Count;
                    fact.UpdatedAt = DateTime.UtcNow;

                    if (isNew)
                    {
                        db.DoctorReferralFacts.Add(fact);
                    }
                }
                catch
                {
                }
                return;
            }

            if (storedEvent.EventType != "BillCreated" && 
                storedEvent.EventType != "PaymentReceived" && 
                storedEvent.EventType != "ProcessingStarted")
            {
                return;
            }

            try
            {
                using var doc = JsonDocument.Parse(storedEvent.PayloadJson);
                var root = doc.RootElement;

                // Extract doctor referral details
                var doctorIdPropExists = root.TryGetProperty("ReferringDoctorId", out var docIdProp);
                var doctorId = doctorIdPropExists && docIdProp.ValueKind != JsonValueKind.Null ? docIdProp.GetString() : null;
                var doctorName = root.TryGetProperty("ReferringDoctorName", out var nameProp) ? nameProp.GetString() : null;

                var resolvedDoctorId = string.IsNullOrEmpty(doctorId) ? "Direct" : doctorId;
                var resolvedDoctorName = string.IsNullOrEmpty(doctorId) ? "Self-Referral" : (string.IsNullOrEmpty(doctorName) ? "Unknown Doctor" : doctorName);

                var dateOnly = storedEvent.OccurredAt.Date;

                var fact = db.DoctorReferralFacts.Local.FirstOrDefault(f =>
                    f.LabId == storedEvent.LabId &&
                    f.Date == dateOnly &&
                    f.DoctorId == resolvedDoctorId);

                if (fact == null)
                {
                    fact = await db.DoctorReferralFacts.FirstOrDefaultAsync(f =>
                        f.LabId == storedEvent.LabId &&
                        f.Date == dateOnly &&
                        f.DoctorId == resolvedDoctorId);
                }

                bool isNew = false;
                if (fact == null)
                {
                    isNew = true;
                    fact = new DoctorReferralFact
                    {
                        Id = Guid.NewGuid(),
                        LabId = storedEvent.LabId,
                        Date = dateOnly,
                        DoctorId = resolvedDoctorId,
                        DoctorName = resolvedDoctorName,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                }
                else
                {
                    // Update doctor name in case it changed/got resolved
                    if (resolvedDoctorId != "Direct" && resolvedDoctorName != "Unknown Doctor" && fact.DoctorName != resolvedDoctorName)
                    {
                        fact.DoctorName = resolvedDoctorName;
                    }
                }

                bool factUpdated = false;

                if (storedEvent.EventType == "BillCreated")
                {
                    fact.PatientCount++;
                    factUpdated = true;
                }
                else if (storedEvent.EventType == "PaymentReceived")
                {
                    if (root.TryGetProperty("Amount", out var amountProp) && amountProp.TryGetDecimal(out var amount))
                    {
                        fact.RevenueGenerated += amount;
                        factUpdated = true;
                    }
                }
                else if (storedEvent.EventType == "ProcessingStarted")
                {
                    fact.TestCount++;
                    factUpdated = true;
                }

                if (factUpdated)
                {
                    fact.UpdatedAt = DateTime.UtcNow;
                    if (isNew)
                    {
                        db.DoctorReferralFacts.Add(fact);
                    }
                }
            }
            catch
            {
                // Ignore parse errors to keep engine running safely
            }
        }
    }
}
