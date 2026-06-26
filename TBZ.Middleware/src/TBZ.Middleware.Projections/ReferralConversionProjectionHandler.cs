using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Projections
{
    public class ReferralConversionProjectionHandler : IProjectionHandler
    {
        public string ProjectionName => "ReferralConversion";

        public async Task ProjectEventAsync(StoredEvent storedEvent, MiddlewareDbContext db)
        {
            if (storedEvent.EventType != "BillCreated" && 
                storedEvent.EventType != "PaymentReceived" && 
                storedEvent.EventType != "ReportSigned")
            {
                return;
            }

            try
            {
                using var doc = JsonDocument.Parse(storedEvent.PayloadJson);
                var root = doc.RootElement;

                // Only track for referred visits
                var partnerIdPropExists = root.TryGetProperty("ReferralPartnerId", out var rpIdProp);
                var partnerId = partnerIdPropExists && rpIdProp.ValueKind != JsonValueKind.Null ? rpIdProp.GetString() : null;

                if (string.IsNullOrEmpty(partnerId))
                {
                    return; // Ignore non-referred visits
                }

                var dateOnly = storedEvent.OccurredAt.Date;

                var fact = db.ReferralConversionFacts.Local.FirstOrDefault(f =>
                    f.LabId == storedEvent.LabId &&
                    f.Date == dateOnly &&
                    f.ReferralPartnerId == partnerId);

                if (fact == null)
                {
                    fact = await db.ReferralConversionFacts.FirstOrDefaultAsync(f =>
                        f.LabId == storedEvent.LabId &&
                        f.Date == dateOnly &&
                        f.ReferralPartnerId == partnerId);
                }

                bool isNew = false;
                if (fact == null)
                {
                    isNew = true;
                    fact = new ReferralConversionFact
                    {
                        Id = Guid.NewGuid(),
                        LabId = storedEvent.LabId,
                        Date = dateOnly,
                        ReferralPartnerId = partnerId,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                }

                bool factUpdated = false;

                if (storedEvent.EventType == "BillCreated")
                {
                    fact.TotalReferredVisits++;
                    factUpdated = true;
                }
                else if (storedEvent.EventType == "PaymentReceived")
                {
                    if (root.TryGetProperty("Amount", out var amountProp) && amountProp.TryGetDecimal(out var amount))
                    {
                        fact.Revenue += amount;
                        factUpdated = true;
                    }
                }
                else if (storedEvent.EventType == "ReportSigned")
                {
                    // A signed report completes/converts the visit
                    fact.ConvertedVisits++;
                    factUpdated = true;
                }

                if (factUpdated)
                {
                    fact.UpdatedAt = DateTime.UtcNow;
                    if (isNew)
                    {
                        db.ReferralConversionFacts.Add(fact);
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
