using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Projections
{
    public class TrendProjectionHandler : IProjectionHandler
    {
        public string ProjectionName => "Trend";

        public async Task ProjectEventAsync(StoredEvent storedEvent, MiddlewareDbContext db)
        {
            if (storedEvent.EventType == "ReleasedVisit")
            {
                try
                {
                    var dto = JsonSerializer.Deserialize<TBZ.Middleware.Domain.DTOs.ReleasedVisitDto>(storedEvent.PayloadJson);
                    if (dto == null) return;

                    var dateOnly = storedEvent.OccurredAt.Date;

                    var resolvedDoctorId = string.IsNullOrEmpty(dto.Referral.DoctorId.ToString()) || dto.Referral.DoctorId == Guid.Empty ? "Direct" : dto.Referral.DoctorId.ToString();
                    var resolvedPartnerId = string.IsNullOrEmpty(dto.Financials.CorporateId.ToString()) || dto.Financials.CorporateId == Guid.Empty ? "Direct" : dto.Financials.CorporateId.ToString();

                    await UpdateTrendFactAsync(db, storedEvent.LabId, dateOnly, "Doctor", resolvedDoctorId, 1, dto.Financials.PaidAmount);
                    await UpdateTrendFactAsync(db, storedEvent.LabId, dateOnly, "ReferralPartner", resolvedPartnerId, 1, dto.Financials.PaidAmount);

                    foreach (var investigation in dto.Investigations)
                    {
                        var testCode = investigation.TestCode;
                        var department = investigation.Department;

                        if (!string.IsNullOrEmpty(testCode))
                        {
                            await UpdateTrendFactAsync(db, storedEvent.LabId, dateOnly, "Test", testCode, 1, 0);
                        }

                        if (!string.IsNullOrEmpty(department))
                        {
                            await UpdateTrendFactAsync(db, storedEvent.LabId, dateOnly, "Department", department, 1, 0);
                        }
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
                var dateOnly = storedEvent.OccurredAt.Date;

                if (storedEvent.EventType == "ProcessingStarted")
                {
                    var testCode = root.TryGetProperty("TestCode", out var tcProp) ? tcProp.GetString() : null;
                    var department = root.TryGetProperty("Department", out var deptProp) ? deptProp.GetString() : null;

                    if (!string.IsNullOrEmpty(testCode))
                    {
                        await UpdateTrendFactAsync(db, storedEvent.LabId, dateOnly, "Test", testCode, 1, 0);
                    }

                    if (!string.IsNullOrEmpty(department))
                    {
                        await UpdateTrendFactAsync(db, storedEvent.LabId, dateOnly, "Department", department, 1, 0);
                    }
                }
                else if (storedEvent.EventType == "BillCreated")
                {
                    var docIdPropExists = root.TryGetProperty("ReferringDoctorId", out var docIdProp);
                    var doctorId = docIdPropExists && docIdProp.ValueKind != JsonValueKind.Null ? docIdProp.GetString() : null;
                    var resolvedDoctorId = string.IsNullOrEmpty(doctorId) ? "Direct" : doctorId;

                    var partnerIdPropExists = root.TryGetProperty("ReferralPartnerId", out var rpIdProp);
                    var partnerId = partnerIdPropExists && rpIdProp.ValueKind != JsonValueKind.Null ? rpIdProp.GetString() : null;
                    var resolvedPartnerId = string.IsNullOrEmpty(partnerId) ? "Direct" : partnerId;

                    await UpdateTrendFactAsync(db, storedEvent.LabId, dateOnly, "Doctor", resolvedDoctorId, 1, 0);
                    await UpdateTrendFactAsync(db, storedEvent.LabId, dateOnly, "ReferralPartner", resolvedPartnerId, 1, 0);
                }
                else if (storedEvent.EventType == "PaymentReceived")
                {
                    if (root.TryGetProperty("Amount", out var amountProp) && amountProp.TryGetDecimal(out var amount))
                    {
                        var docIdPropExists = root.TryGetProperty("ReferringDoctorId", out var docIdProp);
                        var doctorId = docIdPropExists && docIdProp.ValueKind != JsonValueKind.Null ? docIdProp.GetString() : null;
                        var resolvedDoctorId = string.IsNullOrEmpty(doctorId) ? "Direct" : doctorId;

                        var partnerIdPropExists = root.TryGetProperty("ReferralPartnerId", out var rpIdProp);
                        var partnerId = partnerIdPropExists && rpIdProp.ValueKind != JsonValueKind.Null ? rpIdProp.GetString() : null;
                        var resolvedPartnerId = string.IsNullOrEmpty(partnerId) ? "Direct" : partnerId;

                        await UpdateTrendFactAsync(db, storedEvent.LabId, dateOnly, "Doctor", resolvedDoctorId, 0, amount);
                        await UpdateTrendFactAsync(db, storedEvent.LabId, dateOnly, "ReferralPartner", resolvedPartnerId, 0, amount);
                    }
                }
            }
            catch
            {
                // Ignore parse errors to keep engine running safely
            }
        }

        private async Task UpdateTrendFactAsync(
            MiddlewareDbContext db, 
            string labId, 
            DateTime date, 
            string entityType, 
            string entityKey, 
            int countDelta, 
            decimal revenueDelta)
        {
            var fact = db.TrendFacts.Local.FirstOrDefault(f =>
                f.LabId == labId &&
                f.Date == date &&
                f.EntityType == entityType &&
                f.EntityKey == entityKey);

            if (fact == null)
            {
                fact = await db.TrendFacts.FirstOrDefaultAsync(f =>
                    f.LabId == labId &&
                    f.Date == date &&
                    f.EntityType == entityType &&
                    f.EntityKey == entityKey);
            }

            bool isNew = false;
            if (fact == null)
            {
                isNew = true;
                fact = new TrendFact
                {
                    Id = Guid.NewGuid(),
                    LabId = labId,
                    Date = date,
                    EntityType = entityType,
                    EntityKey = entityKey,
                    Count = countDelta,
                    Revenue = revenueDelta,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
            }
            else
            {
                fact.Count += countDelta;
                fact.Revenue += revenueDelta;
                fact.UpdatedAt = DateTime.UtcNow;
            }

            if (isNew)
            {
                db.TrendFacts.Add(fact);
            }
        }
    }
}
