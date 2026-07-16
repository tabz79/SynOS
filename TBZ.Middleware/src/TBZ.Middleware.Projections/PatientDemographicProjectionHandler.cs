using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Projections
{
    public class PatientDemographicProjectionHandler : IProjectionHandler
    {
        public string ProjectionName => "PatientDemographic";

        public async Task ProjectEventAsync(StoredEvent storedEvent, MiddlewareDbContext db)
        {
            if (storedEvent.EventType == "ReleasedVisit")
            {
                try
                {
                    var dto = JsonSerializer.Deserialize<TBZ.Middleware.Domain.DTOs.ReleasedVisitDto>(storedEvent.PayloadJson);
                    if (dto == null) return;

                    var gender = dto.Patient.Gender;
                    var patientLocation = dto.Patient.Area;
                    var patientPincode = dto.Patient.Pincode;

                    var resolvedGender = "Unknown";
                    if (!string.IsNullOrEmpty(gender))
                    {
                        var lower = gender.ToLower();
                        if (lower == "m" || lower == "male") resolvedGender = "Male";
                        else if (lower == "f" || lower == "female") resolvedGender = "Female";
                    }
                    var resolvedLocation = string.IsNullOrEmpty(patientLocation) ? "NotCaptured" : patientLocation;
                    var resolvedPincode = string.IsNullOrEmpty(patientPincode) ? "NotCaptured" : patientPincode;

                    var age = dto.Patient.Age;
                    var ageGroup = "Unknown";
                    if (age <= 18) ageGroup = "0-18";
                    else if (age <= 35) ageGroup = "19-35";
                    else if (age <= 50) ageGroup = "36-50";
                    else if (age <= 65) ageGroup = "51-65";
                    else ageGroup = "66+";

                    var dateOnly = storedEvent.OccurredAt.Date;

                    var fact = db.PatientDemographicFacts.Local.FirstOrDefault(f =>
                        f.LabId == storedEvent.LabId &&
                        f.Date == dateOnly &&
                        f.AgeGroup == ageGroup &&
                        f.Gender == resolvedGender &&
                        f.PatientLocation == resolvedLocation &&
                        f.PatientPincode == resolvedPincode);

                    if (fact == null)
                    {
                        fact = await db.PatientDemographicFacts.FirstOrDefaultAsync(f =>
                            f.LabId == storedEvent.LabId &&
                            f.Date == dateOnly &&
                            f.AgeGroup == ageGroup &&
                            f.Gender == resolvedGender &&
                            f.PatientLocation == resolvedLocation &&
                            f.PatientPincode == resolvedPincode);
                    }

                    bool isNew = false;
                    if (fact == null)
                    {
                        isNew = true;
                        fact = new PatientDemographicFact
                        {
                            Id = Guid.NewGuid(),
                            LabId = storedEvent.LabId,
                            Date = dateOnly,
                            AgeGroup = ageGroup,
                            Gender = resolvedGender,
                            PatientLocation = resolvedLocation,
                            PatientPincode = resolvedPincode,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                    }

                    fact.PatientCount++;
                    fact.Revenue += dto.Financials.PaidAmount;
                    fact.TestCount += dto.Investigations.Count;
                    fact.UpdatedAt = DateTime.UtcNow;

                    if (isNew)
                    {
                        db.PatientDemographicFacts.Add(fact);
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

                // Extract demographics
                var gender = root.TryGetProperty("Gender", out var gProp) ? gProp.GetString() : null;
                var dobString = root.TryGetProperty("DateOfBirth", out var dobProp) ? dobProp.GetString() : null;
                var patientLocation = root.TryGetProperty("PatientLocation", out var locProp) ? locProp.GetString() : null;
                var patientPincode = root.TryGetProperty("PatientPincode", out var pinProp) ? pinProp.GetString() : null;

                var resolvedGender = "Unknown";
                if (!string.IsNullOrEmpty(gender))
                {
                    var lower = gender.ToLower();
                    if (lower == "m" || lower == "male") resolvedGender = "Male";
                    else if (lower == "f" || lower == "female") resolvedGender = "Female";
                }
                var resolvedLocation = string.IsNullOrEmpty(patientLocation) ? "NotCaptured" : patientLocation;
                var resolvedPincode = string.IsNullOrEmpty(patientPincode) ? "NotCaptured" : patientPincode;

                DateTime? dob = null;
                if (!string.IsNullOrEmpty(dobString) && DateTime.TryParse(dobString, out var parsedDob))
                {
                    dob = parsedDob;
                }

                var ageGroup = GetAgeGroup(dob, storedEvent.OccurredAt);
                var dateOnly = storedEvent.OccurredAt.Date;

                var fact = db.PatientDemographicFacts.Local.FirstOrDefault(f =>
                    f.LabId == storedEvent.LabId &&
                    f.Date == dateOnly &&
                    f.AgeGroup == ageGroup &&
                    f.Gender == resolvedGender &&
                    f.PatientLocation == resolvedLocation &&
                    f.PatientPincode == resolvedPincode);

                if (fact == null)
                {
                    fact = await db.PatientDemographicFacts.FirstOrDefaultAsync(f =>
                        f.LabId == storedEvent.LabId &&
                        f.Date == dateOnly &&
                        f.AgeGroup == ageGroup &&
                        f.Gender == resolvedGender &&
                        f.PatientLocation == resolvedLocation &&
                        f.PatientPincode == resolvedPincode);
                }

                bool isNew = false;
                if (fact == null)
                {
                    isNew = true;
                    fact = new PatientDemographicFact
                    {
                        Id = Guid.NewGuid(),
                        LabId = storedEvent.LabId,
                        Date = dateOnly,
                        AgeGroup = ageGroup,
                        Gender = resolvedGender,
                        PatientLocation = resolvedLocation,
                        PatientPincode = resolvedPincode,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
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
                        fact.Revenue += amount;
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
                        db.PatientDemographicFacts.Add(fact);
                    }
                }
            }
            catch
            {
                // Ignore parse errors to keep engine running safely
            }
        }

        private string GetAgeGroup(DateTime? dob, DateTime occurredAt)
        {
            if (!dob.HasValue) return "Unknown";
            int age = occurredAt.Year - dob.Value.Year;
            if (occurredAt.Month < dob.Value.Month || (occurredAt.Month == dob.Value.Month && occurredAt.Day < dob.Value.Day))
            {
                age--;
            }
            if (age < 0) age = 0;

            if (age <= 18) return "0-18";
            if (age <= 35) return "19-35";
            if (age <= 50) return "36-50";
            if (age <= 65) return "51-65";
            return "66+";
        }
    }
}
