using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Projections
{
    public class WorkflowProjectionHandler : IProjectionHandler
    {
        public string ProjectionName => "Workflow";

        public async Task ProjectEventAsync(StoredEvent storedEvent, MiddlewareDbContext db)
        {
            Guid? visitId = null;
            Guid? patientId = null;

            // 1. Try to extract VisitId and PatientId from payload
            try
            {
                using var doc = JsonDocument.Parse(storedEvent.PayloadJson);
                var root = doc.RootElement;

                if (root.TryGetProperty("VisitId", out var visitProp) && visitProp.TryGetGuid(out var vId))
                {
                    visitId = vId;
                }

                if (root.TryGetProperty("PatientId", out var patientProp) && patientProp.TryGetGuid(out var pId))
                {
                    patientId = pId;
                }
            }
            catch
            {
                // Ignore parse errors here
            }

            // Special case: ReportDelivered aggregate type is Report, aggregate ID is ReportId. 
            // We need to resolve VisitId via StoredEvents for that ReportId.
            if (storedEvent.EventType == "ReportDelivered")
            {
                var reportIdStr = storedEvent.AggregateId;
                // Find a ReportDrafted or ReportSigned event for this report
                var relatedEvent = await db.StoredEvents.FirstOrDefaultAsync(e => 
                    (e.EventType == "ReportDrafted" || e.EventType == "ReportSigned") && 
                    e.AggregateId == reportIdStr);

                if (relatedEvent != null)
                {
                    try
                    {
                        using var relatedDoc = JsonDocument.Parse(relatedEvent.PayloadJson);
                        if (relatedDoc.RootElement.TryGetProperty("VisitId", out var vProp) && vProp.TryGetGuid(out var vId))
                        {
                            visitId = vId;
                        }
                        if (relatedDoc.RootElement.TryGetProperty("PatientId", out var pProp) && pProp.TryGetGuid(out var pId))
                        {
                            patientId = pId;
                        }
                    }
                    catch { }
                }
            }

            // If we still can't resolve a VisitId, we cannot project this event onto WorkflowFact
            if (visitId == null)
            {
                return;
            }

            // 2. Fetch or create WorkflowFact
            var fact = await db.WorkflowFacts.FindAsync(visitId.Value);
            bool isNew = false;

            if (fact == null)
            {
                isNew = true;
                fact = new WorkflowFact
                {
                    VisitId = visitId.Value,
                    LabId = storedEvent.LabId,
                    BranchId = storedEvent.BranchId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
            }
            else
            {
                fact.UpdatedAt = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(storedEvent.BranchId))
                {
                    fact.BranchId = storedEvent.BranchId;
                }
            }

            if (patientId != null)
            {
                fact.PatientId = patientId.Value;
            }

            // 3. Apply timestamp updates based on EventType
            switch (storedEvent.EventType)
            {
                case "BillCreated":
                    fact.VisitCreatedAt = storedEvent.OccurredAt;
                    break;

                case "PaymentReceived":
                    fact.PaymentReceivedAt = storedEvent.OccurredAt;
                    break;

                case "SampleCollected":
                    fact.SampleCollectedAt = storedEvent.OccurredAt;
                    break;

                case "ProcessingStarted":
                    fact.ProcessingStartedAt = storedEvent.OccurredAt;
                    break;

                case "ReportSigned":
                    fact.ReportSignedAt = storedEvent.OccurredAt;
                    break;

                case "ReportDelivered":
                    fact.ReportDeliveredAt = storedEvent.OccurredAt;
                    break;
            }

            // 4. Try to backfill PatientRegisteredAt if PatientId is known
            if (fact.PatientId != Guid.Empty && fact.PatientRegisteredAt == null)
            {
                var patientRegEvent = await db.StoredEvents.FirstOrDefaultAsync(e => 
                    e.EventType == "PatientRegistered" && 
                    e.AggregateId == fact.PatientId.ToString());

                if (patientRegEvent != null)
                {
                    fact.PatientRegisteredAt = patientRegEvent.OccurredAt;
                }
            }

            // 5. Save changes
            if (isNew)
            {
                db.WorkflowFacts.Add(fact);
            }
        }
    }
}
