using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Projections
{
    public class DeliveryProjectionHandler : IProjectionHandler
    {
        public string ProjectionName => "Delivery";

        public async Task ProjectEventAsync(StoredEvent storedEvent, MiddlewareDbContext db)
        {
            if (storedEvent.EventType == "ReleasedVisit")
            {
                try
                {
                    var dto = JsonSerializer.Deserialize<TBZ.Middleware.Domain.DTOs.ReleasedVisitDto>(storedEvent.PayloadJson);
                    if (dto != null)
                    {
                        foreach (var report in dto.Reports)
                        {
                            var reportFact = await db.DeliveryFacts.FindAsync(report.ReportId);
                            bool isNewFact = false;
                            if (reportFact == null)
                            {
                                isNewFact = true;
                                reportFact = new DeliveryFact
                                {
                                    ReportId = report.ReportId,
                                    Status = "Delivered",
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };
                            }
                            else
                            {
                                reportFact.Status = "Delivered";
                                reportFact.UpdatedAt = DateTime.UtcNow;
                            }

                            reportFact.PatientId = dto.Patient.PatientId;
                            reportFact.DeliveryMethod = dto.Delivery?.RequestedChannel ?? "Print";
                            reportFact.RequestedAt = report.SignedAt;
                            reportFact.DeliveredAt = report.SignedAt;

                            if (isNewFact)
                            {
                                db.DeliveryFacts.Add(reportFact);
                            }
                        }
                    }
                }
                catch
                {
                }
                return;
            }

            if (storedEvent.EventType != "WhatsappDeliveryRequested" && 
                storedEvent.EventType != "ReportDeliveryRequestedEvent" &&
                storedEvent.EventType != "ReportDelivered")
            {
                return;
            }

            Guid? reportId = null;
            Guid? patientId = null;
            string? deliveryMethod = null;

            try
            {
                using var doc = JsonDocument.Parse(storedEvent.PayloadJson);
                var root = doc.RootElement;

                if (storedEvent.EventType == "WhatsappDeliveryRequested")
                {
                    if (root.TryGetProperty("TargetId", out var targetProp) && targetProp.TryGetGuid(out var tId))
                    {
                        reportId = tId;
                    }
                    deliveryMethod = "WhatsApp";
                }
                else if (storedEvent.EventType == "ReportDeliveryRequestedEvent")
                {
                    if (root.TryGetProperty("ReportId", out var repProp) && repProp.TryGetGuid(out var rId))
                    {
                        reportId = rId;
                    }
                    if (root.TryGetProperty("PatientId", out var patProp) && patProp.TryGetGuid(out var pId))
                    {
                        patientId = pId;
                    }
                    deliveryMethod = "WhatsApp";
                }
                else if (storedEvent.EventType == "ReportDelivered")
                {
                    if (root.TryGetProperty("ReportId", out var repProp) && repProp.TryGetGuid(out var rId))
                    {
                        reportId = rId;
                    }
                    if (root.TryGetProperty("Method", out var methodProp))
                    {
                        deliveryMethod = methodProp.GetString();
                    }
                }
            }
            catch
            {
                // Ignore parse errors
            }

            if (reportId == null)
            {
                return;
            }

            // Fetch or create DeliveryFact
            var fact = await db.DeliveryFacts.FindAsync(reportId.Value);
            bool isNew = false;

            if (fact == null)
            {
                isNew = true;
                fact = new DeliveryFact
                {
                    ReportId = reportId.Value,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
            }
            else
            {
                fact.UpdatedAt = DateTime.UtcNow;
            }

            if (!string.IsNullOrEmpty(deliveryMethod))
            {
                fact.DeliveryMethod = deliveryMethod;
            }

            // Resolve PatientId if not already set
            if (fact.PatientId == Guid.Empty)
            {
                // Look up in StoredEvents for ReportSigned or ReportDrafted
                var reportIdStr = reportId.Value.ToString();
                var refEvent = await db.StoredEvents.FirstOrDefaultAsync(e => 
                    (e.EventType == "ReportSigned" || e.EventType == "ReportDrafted") && 
                    e.AggregateId == reportIdStr);

                if (refEvent != null)
                {
                    try
                    {
                        using var refDoc = JsonDocument.Parse(refEvent.PayloadJson);
                        if (refDoc.RootElement.TryGetProperty("PatientId", out var pProp) && pProp.TryGetGuid(out var pId))
                        {
                            patientId = pId;
                        }
                    }
                    catch { }
                }

                if (patientId != null)
                {
                    fact.PatientId = patientId.Value;
                }
            }

            // Update timestamps and status based on EventType
            if (storedEvent.EventType == "WhatsappDeliveryRequested" || storedEvent.EventType == "ReportDeliveryRequestedEvent")
            {
                fact.RequestedAt = storedEvent.OccurredAt;
            }
            else if (storedEvent.EventType == "ReportDelivered")
            {
                fact.DeliveredAt = storedEvent.OccurredAt;
                fact.Status = "Delivered";
            }

            if (isNew)
            {
                db.DeliveryFacts.Add(fact);
            }
        }
    }
}
