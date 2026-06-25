using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Projections
{
    public class DailyOperationsProjectionHandler : IProjectionHandler
    {
        public string ProjectionName => "DailyOperations";

        public async Task ProjectEventAsync(StoredEvent storedEvent, MiddlewareDbContext db)
        {
            var dateOnly = storedEvent.OccurredAt.Date;
            
            // Fetch or create DailyOperationsFact for the specific Lab and Date
            // Check local tracker first to avoid inserting duplicates in same batch before SaveChanges
            var fact = db.DailyOperationsFacts.Local.FirstOrDefault(f => 
                f.LabId == storedEvent.LabId && f.Date == dateOnly);

            if (fact == null)
            {
                fact = await db.DailyOperationsFacts.FirstOrDefaultAsync(f => 
                    f.LabId == storedEvent.LabId && f.Date == dateOnly);
            }

            bool isNew = false;
            if (fact == null)
            {
                isNew = true;
                fact = new DailyOperationsFact
                {
                    Id = Guid.NewGuid(),
                    LabId = storedEvent.LabId,
                    Date = dateOnly,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
            }
            else
            {
                fact.UpdatedAt = DateTime.UtcNow;
            }

            bool factUpdated = false;

            switch (storedEvent.EventType)
            {
                case "PatientRegistered":
                    fact.PatientsRegistered++;
                    factUpdated = true;
                    break;

                case "BillCreated":
                    fact.BillsCreated++;
                    factUpdated = true;
                    break;

                case "PaymentReceived":
                    try
                    {
                        using var doc = JsonDocument.Parse(storedEvent.PayloadJson);
                        if (doc.RootElement.TryGetProperty("Amount", out var amountProp) && amountProp.TryGetDecimal(out var amount))
                        {
                            fact.RevenueCollected += amount;
                        }
                    }
                    catch
                    {
                        // Fallback in case of parse issues
                    }
                    fact.PaymentsCount++;
                    factUpdated = true;
                    break;

                case "SampleCollected":
                    fact.SamplesCollected++;
                    factUpdated = true;
                    break;

                case "ReportSigned":
                    fact.ReportsSigned++;
                    factUpdated = true;
                    break;

                case "ReportDelivered":
                    fact.ReportsDelivered++;
                    factUpdated = true;
                    break;
            }

            if (factUpdated && isNew)
            {
                db.DailyOperationsFacts.Add(fact);
            }
        }
    }
}
