using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Projections
{
    public class ReferralPartnerProjectionHandler : IProjectionHandler
    {
        public string ProjectionName => "ReferralPartner";

        public async Task ProjectEventAsync(StoredEvent storedEvent, MiddlewareDbContext db)
        {
            if (storedEvent.EventType == "ReleasedVisit")
            {
                try
                {
                    var dto = JsonSerializer.Deserialize<TBZ.Middleware.Domain.DTOs.ReleasedVisitDto>(storedEvent.PayloadJson);
                    if (dto == null) return;

                    var partnerId = string.IsNullOrEmpty(dto.Financials.CorporateId.ToString()) || dto.Financials.CorporateId == Guid.Empty ? "Direct" : dto.Financials.CorporateId.ToString();
                    var partnerName = partnerId == "Direct" ? "Direct" : (string.IsNullOrEmpty(dto.Financials.CorporateName) ? "Unknown Partner" : dto.Financials.CorporateName);
                    var partnerLocation = "Unknown Location";

                    var dateOnly = storedEvent.OccurredAt.Date;

                    var fact = db.ReferralPartnerFacts.Local.FirstOrDefault(f =>
                        f.LabId == storedEvent.LabId &&
                        f.Date == dateOnly &&
                        f.ReferralPartnerId == partnerId);

                    if (fact == null)
                    {
                        fact = await db.ReferralPartnerFacts.FirstOrDefaultAsync(f =>
                            f.LabId == storedEvent.LabId &&
                            f.Date == dateOnly &&
                            f.ReferralPartnerId == partnerId);
                    }

                    bool isNew = false;
                    if (fact == null)
                    {
                        isNew = true;
                        fact = new ReferralPartnerFact
                        {
                            Id = Guid.NewGuid(),
                            LabId = storedEvent.LabId,
                            Date = dateOnly,
                            ReferralPartnerId = partnerId,
                            ReferralPartnerName = partnerName,
                            ReferralPartnerLocation = partnerLocation,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                    }
                    else
                    {
                        if (partnerId != "Direct" && partnerName != "Unknown Partner" && fact.ReferralPartnerName != partnerName)
                        {
                            fact.ReferralPartnerName = partnerName;
                        }
                    }

                    fact.PatientCount++;
                    fact.RevenueGenerated += dto.Financials.PaidAmount;
                    fact.TestCount += dto.Investigations.Count;
                    fact.UpdatedAt = DateTime.UtcNow;

                    if (isNew)
                    {
                        db.ReferralPartnerFacts.Add(fact);
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

                // Extract referral partner details
                var partnerIdPropExists = root.TryGetProperty("ReferralPartnerId", out var rpIdProp);
                var partnerId = partnerIdPropExists && rpIdProp.ValueKind != JsonValueKind.Null ? rpIdProp.GetString() : null;
                var partnerName = root.TryGetProperty("ReferralPartnerName", out var nameProp) ? nameProp.GetString() : null;
                var partnerLocation = root.TryGetProperty("ReferralPartnerLocation", out var locProp) ? locProp.GetString() : null;

                var resolvedPartnerId = string.IsNullOrEmpty(partnerId) ? "Direct" : partnerId;
                var resolvedPartnerName = string.IsNullOrEmpty(partnerId) ? "Direct" : (string.IsNullOrEmpty(partnerName) ? "Unknown Partner" : partnerName);
                var resolvedPartnerLocation = string.IsNullOrEmpty(partnerId) ? "Direct" : (string.IsNullOrEmpty(partnerLocation) ? "Unknown Location" : partnerLocation);

                var dateOnly = storedEvent.OccurredAt.Date;

                var fact = db.ReferralPartnerFacts.Local.FirstOrDefault(f =>
                    f.LabId == storedEvent.LabId &&
                    f.Date == dateOnly &&
                    f.ReferralPartnerId == resolvedPartnerId);

                if (fact == null)
                {
                    fact = await db.ReferralPartnerFacts.FirstOrDefaultAsync(f =>
                        f.LabId == storedEvent.LabId &&
                        f.Date == dateOnly &&
                        f.ReferralPartnerId == resolvedPartnerId);
                }

                bool isNew = false;
                if (fact == null)
                {
                    isNew = true;
                    fact = new ReferralPartnerFact
                    {
                        Id = Guid.NewGuid(),
                        LabId = storedEvent.LabId,
                        Date = dateOnly,
                        ReferralPartnerId = resolvedPartnerId,
                        ReferralPartnerName = resolvedPartnerName,
                        ReferralPartnerLocation = resolvedPartnerLocation,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                }
                else
                {
                    // Update partner details in case they changed/got resolved
                    if (resolvedPartnerId != "Direct")
                    {
                        if (resolvedPartnerName != "Unknown Partner" && fact.ReferralPartnerName != resolvedPartnerName)
                        {
                            fact.ReferralPartnerName = resolvedPartnerName;
                        }
                        if (resolvedPartnerLocation != "Unknown Location" && fact.ReferralPartnerLocation != resolvedPartnerLocation)
                        {
                            fact.ReferralPartnerLocation = resolvedPartnerLocation;
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
                        db.ReferralPartnerFacts.Add(fact);
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
