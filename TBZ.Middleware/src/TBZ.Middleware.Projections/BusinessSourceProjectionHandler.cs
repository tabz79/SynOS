using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Projections
{
    public class BusinessSourceProjectionHandler : IProjectionHandler
    {
        public string ProjectionName => "BusinessSource";

        public async Task ProjectEventAsync(StoredEvent storedEvent, MiddlewareDbContext db)
        {
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

                // Extract PatientId and VisitId
                if (!root.TryGetProperty("PatientId", out var pProp) || !pProp.TryGetGuid(out var patientId))
                {
                    return;
                }
                if (!root.TryGetProperty("VisitId", out var vProp) || !vProp.TryGetGuid(out var visitId))
                {
                    return;
                }

                // Determine if this is the patient's first visit
                bool hasPriorVisit = await db.WorkflowFacts.AnyAsync(w => 
                    w.PatientId == patientId && 
                    w.VisitId != visitId && 
                    w.VisitCreatedAt != null && 
                    w.VisitCreatedAt < storedEvent.OccurredAt);
                bool isFirstVisit = !hasPriorVisit;

                // Extract referring doctor and referral partner details
                var docIdPropExists = root.TryGetProperty("ReferringDoctorId", out var docIdProp);
                var doctorId = docIdPropExists && docIdProp.ValueKind != JsonValueKind.Null ? docIdProp.GetString() : null;

                var partnerIdPropExists = root.TryGetProperty("ReferralPartnerId", out var partnerIdProp);
                var partnerId = partnerIdPropExists && partnerIdProp.ValueKind != JsonValueKind.Null ? partnerIdProp.GetString() : null;

                // Resolve generic business source
                BusinessSourceType sourceType;
                string sourceId;
                string sourceName;

                if (!string.IsNullOrEmpty(doctorId))
                {
                    sourceType = BusinessSourceType.Doctor;
                    sourceId = doctorId;
                    var namePropExists = root.TryGetProperty("ReferringDoctorName", out var nameProp);
                    sourceName = namePropExists && nameProp.ValueKind != JsonValueKind.Null && !string.IsNullOrEmpty(nameProp.GetString())
                        ? nameProp.GetString()!
                        : "Unknown Doctor";
                }
                else if (!string.IsNullOrEmpty(partnerId))
                {
                    sourceType = BusinessSourceType.ReferralPartner;
                    sourceId = partnerId;
                    var namePropExists = root.TryGetProperty("ReferralPartnerName", out var nameProp);
                    sourceName = namePropExists && nameProp.ValueKind != JsonValueKind.Null && !string.IsNullOrEmpty(nameProp.GetString())
                        ? nameProp.GetString()!
                        : "Unknown Partner";
                }
                else
                {
                    sourceType = BusinessSourceType.WalkIn;
                    sourceId = "Direct";
                    sourceName = "Direct";
                }

                var dateOnly = storedEvent.OccurredAt.Date;

                var fact = db.BusinessSourceFacts.Local.FirstOrDefault(f =>
                    f.LabId == storedEvent.LabId &&
                    f.Date == dateOnly &&
                    f.SourceType == sourceType &&
                    f.SourceId == sourceId &&
                    f.IsFirstVisit == isFirstVisit);

                if (fact == null)
                {
                    fact = await db.BusinessSourceFacts.FirstOrDefaultAsync(f =>
                        f.LabId == storedEvent.LabId &&
                        f.Date == dateOnly &&
                        f.SourceType == sourceType &&
                        f.SourceId == sourceId &&
                        f.IsFirstVisit == isFirstVisit);
                }

                bool isNew = false;
                if (fact == null)
                {
                    isNew = true;
                    fact = new BusinessSourceFact
                    {
                        Id = Guid.NewGuid(),
                        LabId = storedEvent.LabId,
                        Date = dateOnly,
                        SourceType = sourceType,
                        SourceId = sourceId,
                        SourceName = sourceName,
                        IsFirstVisit = isFirstVisit,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                }
                else
                {
                    // Update partner/doctor name in case it changed/got resolved
                    if (sourceId != "Direct")
                    {
                        if (sourceType == BusinessSourceType.Doctor && sourceName != "Unknown Doctor" && fact.SourceName != sourceName)
                        {
                            fact.SourceName = sourceName;
                        }
                        else if (sourceType == BusinessSourceType.ReferralPartner && sourceName != "Unknown Partner" && fact.SourceName != sourceName)
                        {
                            fact.SourceName = sourceName;
                        }
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
                        db.BusinessSourceFacts.Add(fact);
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
