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
                case "ReleasedVisit":
                    try
                    {
                        var dto = JsonSerializer.Deserialize<TBZ.Middleware.Domain.DTOs.ReleasedVisitDto>(storedEvent.PayloadJson);
                        if (dto != null)
                        {
                            fact.PatientsRegistered++;
                            fact.BillsCreated++;
                            fact.RevenueCollected += dto.Financials.PaidAmount;
                            fact.PaymentsCount++;
                            fact.SamplesCollected += dto.Investigations.Count;
                            fact.ReportsSigned += dto.Reports.Count;
                            fact.ReportsDelivered += dto.Reports.Count;
                            factUpdated = true;
                        }
                    }
                    catch
                    {
                    }
                    break;

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

                case "PatientDemographicsSync":
                    fact.PatientsRegistered++;
                    factUpdated = true;
                    break;

                case "PatientVisitFact":
                    try
                    {
                        using var doc = JsonDocument.Parse(storedEvent.PayloadJson);
                        decimal fee = 0;
                        if (doc.RootElement.TryGetProperty("consultationFee", out var feeProp) && feeProp.TryGetDecimal(out var parsedFee)) fee = parsedFee;
                        else if (doc.RootElement.TryGetProperty("ConsultationFee", out var feeProp2) && feeProp2.TryGetDecimal(out var parsedFee2)) fee = parsedFee2;
                        
                        fact.BillsCreated++;
                        fact.PaymentsCount++;
                        fact.RevenueCollected += fee;
                        factUpdated = true;
                    }
                    catch {}
                    break;

                case "ClinicFinancialFact":
                    try
                    {
                        using var doc = JsonDocument.Parse(storedEvent.PayloadJson);
                        decimal payable = 0;
                        if (doc.RootElement.TryGetProperty("netPayable", out var payProp) && payProp.TryGetDecimal(out var parsedPay)) payable = parsedPay;
                        else if (doc.RootElement.TryGetProperty("NetPayable", out var payProp2) && payProp2.TryGetDecimal(out var parsedPay2)) payable = parsedPay2;
                        
                        fact.BillsCreated++;
                        fact.PaymentsCount++;
                        fact.RevenueCollected += payable;
                        factUpdated = true;
                    }
                    catch {}
                    break;
            }

            if (factUpdated && isNew)
            {
                db.DailyOperationsFacts.Add(fact);
            }
        }
    }
}
