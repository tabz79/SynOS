using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Projections
{
    public class PatientIntelligenceProjectionHandler : IProjectionHandler
    {
        public string ProjectionName => "PatientIntelligence";

        public async Task ProjectEventAsync(StoredEvent storedEvent, MiddlewareDbContext db)
        {
            if (storedEvent.EventType == "ReleasedVisit")
            {
                try
                {
                    var dto = JsonSerializer.Deserialize<TBZ.Middleware.Domain.DTOs.ReleasedVisitDto>(storedEvent.PayloadJson);
                    if (dto == null) return;

                    var patientId = dto.Patient.PatientId;
                    var visitId = dto.VisitId;

                    // 1. PatientIntelligenceFact
                    var patientFact = db.PatientIntelligenceFacts.Local.FirstOrDefault(p => p.PatientId == patientId)
                                      ?? await db.PatientIntelligenceFacts.FirstOrDefaultAsync(p => p.PatientId == patientId);
                    
                    var resolvedGender = "Unknown";
                    if (!string.IsNullOrEmpty(dto.Patient.Gender))
                    {
                        var lower = dto.Patient.Gender.ToLowerInvariant();
                        if (lower == "m" || lower == "male") resolvedGender = "Male";
                        else if (lower == "f" || lower == "female") resolvedGender = "Female";
                    }

                    var resolvedReferrer = "Direct Walk-In";
                    if (!string.IsNullOrEmpty(dto.Referral.DoctorName)) resolvedReferrer = dto.Referral.DoctorName;
                    else if (!string.IsNullOrEmpty(dto.Financials.CorporateName)) resolvedReferrer = dto.Financials.CorporateName;

                    var patientLocation = dto.Patient?.Area ?? string.Empty;
                    var testsSummary = dto.Investigations != null && dto.Investigations.Count > 0
                        ? string.Join(", ", dto.Investigations.Select(i => i.TestName ?? i.TestCode))
                        : "Diagnostic Profile";

                    bool isNewPatient = patientFact == null;
                    if (isNewPatient)
                    {
                        patientFact = new PatientIntelligenceFact
                        {
                            PatientId = patientId,
                            LabId = dto.LabId,
                            MRN = "MRN-" + patientId.ToString().Substring(0, 8).ToUpper(),
                            PatientName = dto.Patient.Name,
                            DateOfBirth = DateTime.UtcNow.AddYears(-dto.Patient.Age),
                            Gender = resolvedGender,
                            MobileNumber = dto.Patient.Mobile,
                            ReferringDoctorOrPartner = resolvedReferrer,
                            ReferringDoctorId = dto.Referral.DoctorId != Guid.Empty ? dto.Referral.DoctorId : null,
                            ReferralPartnerId = dto.Financials.CorporateId,
                            LastVisitedBranchId = dto.BranchId?.ToString() ?? string.Empty,
                            Location = !string.IsNullOrEmpty(patientLocation) ? patientLocation : "Local Area",
                            ReasonForVisit = testsSummary,
                            TotalVisits = 1,
                            FirstVisitDate = dto.VisitDate,
                            LastVisitDate = dto.VisitDate,
                            LifetimeRevenue = dto.Financials.PaidAmount,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        db.PatientIntelligenceFacts.Add(patientFact);
                    }
                    else
                    {
                        patientFact.PatientName = dto.Patient.Name;
                        patientFact.Gender = resolvedGender;
                        patientFact.MobileNumber = dto.Patient.Mobile;
                        patientFact.ReferringDoctorOrPartner = resolvedReferrer;
                        patientFact.ReferringDoctorId = dto.Referral.DoctorId != Guid.Empty ? dto.Referral.DoctorId : null;
                        patientFact.ReferralPartnerId = dto.Financials.CorporateId;
                        patientFact.LastVisitedBranchId = dto.BranchId?.ToString() ?? string.Empty;
                        patientFact.LastVisitDate = dto.VisitDate;
                        if (!string.IsNullOrEmpty(patientLocation)) patientFact.Location = patientLocation;
                        patientFact.ReasonForVisit = testsSummary;
                        
                        var alreadyVisited = await db.PatientVisitFacts.AnyAsync(v => v.PatientId == patientId && v.VisitId != visitId);
                        if (!alreadyVisited)
                        {
                            patientFact.TotalVisits = 1;
                            patientFact.FirstVisitDate = dto.VisitDate;
                        }
                        else
                        {
                            var dbVisitsCount = await db.PatientVisitFacts.CountAsync(v => v.PatientId == patientId && v.VisitId != visitId);
                            patientFact.TotalVisits = dbVisitsCount + 1;
                        }
                        
                        var dbPaid = await db.PatientVisitFacts.Where(v => v.PatientId == patientId && v.VisitId != visitId).SumAsync(v => v.AmountPaid);
                        patientFact.LifetimeRevenue = dbPaid + dto.Financials.PaidAmount;
                        patientFact.UpdatedAt = DateTime.UtcNow;
                    }

                    // 2. PatientVisitFact
                    var visitFact = db.PatientVisitFacts.Local.FirstOrDefault(v => v.VisitId == visitId)
                                    ?? await db.PatientVisitFacts.FirstOrDefaultAsync(v => v.VisitId == visitId);
                    
                    var token = visitId.ToString().Substring(0, 8).ToUpper();

                    bool isNewVisit = visitFact == null;
                    if (isNewVisit)
                    {
                        visitFact = new PatientVisitFact
                        {
                            VisitId = visitId,
                            PatientId = patientId,
                            LabId = dto.LabId,
                            Token = token,
                            VisitDate = dto.VisitDate,
                            ReferringDoctorOrPartner = resolvedReferrer,
                            ReferringDoctorId = dto.Referral.DoctorId != Guid.Empty ? dto.Referral.DoctorId : null,
                            ReferralPartnerId = dto.Financials.CorporateId,
                            AmountPaid = dto.Financials.PaidAmount,
                            CommissionAmount = dto.Referral != null ? dto.Referral.CommissionAmount : 0m,
                            Location = !string.IsNullOrEmpty(patientLocation) ? patientLocation : "Local Area",
                            ReasonForVisit = testsSummary,
                            TestsJson = JsonSerializer.Serialize(dto.Investigations.Select(i => i.TestCode).ToList()),
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        db.PatientVisitFacts.Add(visitFact);
                    }
                    else
                    {
                        visitFact.ReferringDoctorOrPartner = resolvedReferrer;
                        visitFact.ReferringDoctorId = dto.Referral.DoctorId != Guid.Empty ? dto.Referral.DoctorId : null;
                        visitFact.ReferralPartnerId = dto.Financials.CorporateId;
                        visitFact.AmountPaid = dto.Financials.PaidAmount;
                        visitFact.CommissionAmount = dto.Referral != null ? dto.Referral.CommissionAmount : 0m;
                        if (!string.IsNullOrEmpty(patientLocation)) visitFact.Location = patientLocation;
                        visitFact.ReasonForVisit = testsSummary;
                        visitFact.TestsJson = JsonSerializer.Serialize(dto.Investigations.Select(i => i.TestCode).ToList());
                        visitFact.UpdatedAt = DateTime.UtcNow;
                    }
                }
                catch
                {
                }
                return;
            }

            if (storedEvent.EventType != "PatientRegistered" &&
                storedEvent.EventType != "BillCreated" &&
                storedEvent.EventType != "PaymentReceived" &&
                storedEvent.EventType != "ProcessingStarted" &&
                storedEvent.EventType != "PatientDemographicsSync" &&
                storedEvent.EventType != "PatientVisitFact")
            {
                return;
            }

            try
            {
                using var doc = JsonDocument.Parse(storedEvent.PayloadJson);
                var root = doc.RootElement;

                if (storedEvent.EventType == "PatientDemographicsSync")
                {
                    await HandlePatientDemographicsSyncAsync(storedEvent, root, db);
                }
                else if (storedEvent.EventType == "PatientVisitFact")
                {
                    await HandleClinicVisitFactAsync(storedEvent, root, db);
                }
                else if (storedEvent.EventType == "PatientRegistered")
                {
                    await HandlePatientRegisteredAsync(storedEvent, root, db);
                }
                else if (storedEvent.EventType == "BillCreated")
                {
                    await HandleBillCreatedAsync(storedEvent, root, db);
                }
                else if (storedEvent.EventType == "PaymentReceived")
                {
                    await HandlePaymentReceivedAsync(storedEvent, root, db);
                }
                else if (storedEvent.EventType == "ProcessingStarted")
                {
                    await HandleProcessingStartedAsync(storedEvent, root, db);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error projecting patient intelligence event: {ex.Message}");
                throw;
            }
        }

        private async Task HandlePatientDemographicsSyncAsync(StoredEvent storedEvent, JsonElement root, MiddlewareDbContext db)
        {
            var patientIdStr = (root.TryGetProperty("patientId", out var pProp) ? pProp.GetString() : null)
                               ?? (root.TryGetProperty("PatientId", out var pProp2) ? pProp2.GetString() : null);
            if (string.IsNullOrEmpty(patientIdStr) || !Guid.TryParse(patientIdStr, out var patientId)) return;

            var fullName = (root.TryGetProperty("fullName", out var fnProp) ? fnProp.GetString() : null)
                           ?? (root.TryGetProperty("FullName", out var fnProp2) ? fnProp2.GetString() : "Walk-in Patient");
            var mrn = (root.TryGetProperty("mrn", out var mrnProp) ? mrnProp.GetString() : null)
                      ?? (root.TryGetProperty("MRN", out var mrnProp2) ? mrnProp2.GetString() : $"MRN-{patientId.ToString().Substring(0, 8).ToUpper()}");
            var phone = (root.TryGetProperty("phoneNumber", out var phProp) ? phProp.GetString() : null)
                        ?? (root.TryGetProperty("PhoneNumber", out var phProp2) ? phProp2.GetString() : "");
            var gender = (root.TryGetProperty("gender", out var gProp) ? gProp.GetString() : null)
                         ?? (root.TryGetProperty("Gender", out var gProp2) ? gProp2.GetString() : "Unknown");
            var locality = (root.TryGetProperty("addressLocality", out var locProp) ? locProp.GetString() : null)
                           ?? (root.TryGetProperty("AddressLocality", out var locProp2) ? locProp2.GetString() : "Local Catchment");
            var triggerReason = (root.TryGetProperty("triggerReason", out var trProp) ? trProp.GetString() : null)
                                ?? (root.TryGetProperty("TriggerReason", out var trProp2) ? trProp2.GetString() : "OPD Registration");

            int age = 0;
            if (root.TryGetProperty("age", out var ageProp) && ageProp.TryGetInt32(out var parsedAge)) age = parsedAge;
            else if (root.TryGetProperty("Age", out var ageProp2) && ageProp2.TryGetInt32(out var parsedAge2)) age = parsedAge2;

            var resolvedGender = "Unknown";
            if (!string.IsNullOrEmpty(gender))
            {
                var lower = gender.ToLowerInvariant();
                if (lower == "m" || lower == "male") resolvedGender = "Male";
                else if (lower == "f" || lower == "female") resolvedGender = "Female";
                else resolvedGender = gender;
            }

            var fact = db.PatientIntelligenceFacts.Local.FirstOrDefault(f => f.PatientId == patientId)
                       ?? await db.PatientIntelligenceFacts.FirstOrDefaultAsync(f => f.PatientId == patientId);

            if (fact == null)
            {
                fact = new PatientIntelligenceFact
                {
                    PatientId = patientId,
                    LabId = storedEvent.LabId,
                    MRN = mrn ?? $"MRN-{patientId.ToString().Substring(0, 8).ToUpper()}",
                    PatientName = fullName ?? "Walk-in Patient",
                    DateOfBirth = age > 0 ? DateTime.UtcNow.AddYears(-age) : null,
                    Gender = resolvedGender,
                    MobileNumber = phone ?? "",
                    Location = !string.IsNullOrEmpty(locality) ? locality : "Local Catchment",
                    ReasonForVisit = !string.IsNullOrEmpty(triggerReason) ? triggerReason : "OPD Registration",
                    TotalVisits = 1,
                    FirstVisitDate = storedEvent.OccurredAt,
                    LastVisitDate = storedEvent.OccurredAt,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.PatientIntelligenceFacts.Add(fact);
            }
            else
            {
                fact.PatientName = !string.IsNullOrEmpty(fullName) ? fullName : fact.PatientName;
                fact.MRN = !string.IsNullOrEmpty(mrn) ? mrn : fact.MRN;
                fact.Gender = resolvedGender;
                fact.MobileNumber = !string.IsNullOrEmpty(phone) ? phone : fact.MobileNumber;
                if (!string.IsNullOrEmpty(locality)) fact.Location = locality;
                if (!string.IsNullOrEmpty(triggerReason)) fact.ReasonForVisit = triggerReason;
                fact.UpdatedAt = DateTime.UtcNow;
            }
        }

        private async Task HandleClinicVisitFactAsync(StoredEvent storedEvent, JsonElement root, MiddlewareDbContext db)
        {
            var visitIdStr = (root.TryGetProperty("visitId", out var vProp) ? vProp.GetString() : null)
                             ?? (root.TryGetProperty("VisitId", out var vProp2) ? vProp2.GetString() : null);
            var patientIdStr = (root.TryGetProperty("patientId", out var pProp) ? pProp.GetString() : null)
                               ?? (root.TryGetProperty("PatientId", out var pProp2) ? pProp2.GetString() : null);

            if (string.IsNullOrEmpty(visitIdStr) || !Guid.TryParse(visitIdStr, out var visitId)) return;
            if (string.IsNullOrEmpty(patientIdStr) || !Guid.TryParse(patientIdStr, out var patientId)) return;

            var token = (root.TryGetProperty("tokenNumber", out var tProp) ? tProp.GetString() : null)
                        ?? (root.TryGetProperty("TokenNumber", out var tProp2) ? tProp2.GetString() : visitId.ToString().Substring(0, 8).ToUpper());
            var doctorName = (root.TryGetProperty("doctorName", out var dProp) ? dProp.GetString() : null)
                             ?? (root.TryGetProperty("DoctorName", out var dProp2) ? dProp2.GetString() : "Staff Doctor");
            var doctorSpecialty = (root.TryGetProperty("doctorSpecialty", out var dsProp) ? dsProp.GetString() : null)
                                  ?? (root.TryGetProperty("DoctorSpecialty", out var dsProp2) ? dsProp2.GetString() : "General Practice");
            var department = (root.TryGetProperty("department", out var depProp) ? depProp.GetString() : null)
                             ?? (root.TryGetProperty("Department", out var depProp2) ? depProp2.GetString() : "OPD");

            decimal fee = 0;
            if (root.TryGetProperty("consultationFee", out var feeProp) && feeProp.TryGetDecimal(out var parsedFee)) fee = parsedFee;
            else if (root.TryGetProperty("ConsultationFee", out var feeProp2) && feeProp2.TryGetDecimal(out var parsedFee2)) fee = parsedFee2;

            DateTime visitDate = storedEvent.OccurredAt;
            if (root.TryGetProperty("visitDate", out var vdProp) && vdProp.TryGetDateTime(out var parsedDate)) visitDate = parsedDate;
            else if (root.TryGetProperty("VisitDate", out var vdProp2) && vdProp2.TryGetDateTime(out var parsedDate2)) visitDate = parsedDate2;

            var reason = $"{department} - {doctorSpecialty}";

            // 1. Visit Fact
            var visitFact = db.PatientVisitFacts.Local.FirstOrDefault(v => v.VisitId == visitId)
                            ?? await db.PatientVisitFacts.FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visitFact == null)
            {
                visitFact = new PatientVisitFact
                {
                    VisitId = visitId,
                    PatientId = patientId,
                    LabId = storedEvent.LabId,
                    Token = token ?? visitId.ToString().Substring(0, 8).ToUpper(),
                    VisitDate = visitDate,
                    AmountPaid = fee,
                    ReferringDoctorOrPartner = doctorName ?? "Consulting Physician",
                    ReasonForVisit = reason,
                    Location = "Local Catchment",
                    TestsJson = "[]",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.PatientVisitFacts.Add(visitFact);
            }
            else
            {
                visitFact.AmountPaid = fee;
                visitFact.ReferringDoctorOrPartner = doctorName ?? visitFact.ReferringDoctorOrPartner;
                visitFact.ReasonForVisit = reason;
                visitFact.UpdatedAt = DateTime.UtcNow;
            }

            // 2. Patient Fact
            var patientFact = db.PatientIntelligenceFacts.Local.FirstOrDefault(p => p.PatientId == patientId)
                              ?? await db.PatientIntelligenceFacts.FirstOrDefaultAsync(p => p.PatientId == patientId);
            if (patientFact != null)
            {
                patientFact.TotalVisits++;
                patientFact.LifetimeRevenue += fee;
                patientFact.LastVisitDate = visitDate;
                patientFact.ReasonForVisit = reason;
                if (!string.IsNullOrEmpty(doctorName)) patientFact.ReferringDoctorOrPartner = doctorName;
                patientFact.UpdatedAt = DateTime.UtcNow;
            }
        }

        private async Task HandlePatientRegisteredAsync(StoredEvent storedEvent, JsonElement root, MiddlewareDbContext db)
        {
            var patientIdStr = root.TryGetProperty("PatientId", out var idProp) ? idProp.GetString() : null;
            if (string.IsNullOrEmpty(patientIdStr) || !Guid.TryParse(patientIdStr, out var patientId)) return;

            var firstName = root.TryGetProperty("FirstName", out var fnProp) ? fnProp.GetString() : string.Empty;
            var lastName = root.TryGetProperty("LastName", out var lnProp) ? lnProp.GetString() : string.Empty;
            var mrn = root.TryGetProperty("MRN", out var mrnProp) ? mrnProp.GetString() : string.Empty;
            var gender = root.TryGetProperty("Gender", out var gProp) ? gProp.GetString() : string.Empty;
            var dobString = root.TryGetProperty("DateOfBirth", out var dobProp) ? dobProp.GetString() : null;
            var phone = root.TryGetProperty("CurrentPhoneNumber", out var phProp) ? phProp.GetString() : string.Empty;
            var location = (root.TryGetProperty("Area", out var aProp) ? aProp.GetString() : null)
                           ?? (root.TryGetProperty("Address", out var adProp) ? adProp.GetString() : null)
                           ?? (root.TryGetProperty("Locality", out var locProp) ? locProp.GetString() : "Local Area");

            DateTime? dob = null;
            if (!string.IsNullOrEmpty(dobString) && DateTime.TryParse(dobString, out var parsedDob))
            {
                dob = parsedDob;
            }

            var resolvedGender = "Unknown";
            if (!string.IsNullOrEmpty(gender))
            {
                var lower = gender.ToLowerInvariant();
                if (lower == "m" || lower == "male") resolvedGender = "Male";
                else if (lower == "f" || lower == "female") resolvedGender = "Female";
            }

            var fact = db.PatientIntelligenceFacts.Local.FirstOrDefault(f => f.PatientId == patientId)
                       ?? await db.PatientIntelligenceFacts.FirstOrDefaultAsync(f => f.PatientId == patientId);
            bool isNew = fact == null;

            if (isNew)
            {
                fact = new PatientIntelligenceFact
                {
                    PatientId = patientId,
                    LabId = storedEvent.LabId,
                    MRN = mrn,
                    PatientName = $"{firstName} {lastName}".Trim(),
                    DateOfBirth = dob,
                    Gender = resolvedGender,
                    MobileNumber = phone,
                    Location = !string.IsNullOrEmpty(location) ? location : "Local Area",
                    ReasonForVisit = "Laboratory Registration",
                    TotalVisits = 1,
                    FirstVisitDate = storedEvent.OccurredAt,
                    LastVisitDate = storedEvent.OccurredAt,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.PatientIntelligenceFacts.Add(fact);
            }
            else
            {
                fact.MRN = mrn;
                fact.PatientName = $"{firstName} {lastName}".Trim();
                fact.DateOfBirth = dob;
                fact.Gender = resolvedGender;
                fact.MobileNumber = phone;
                if (!string.IsNullOrEmpty(location)) fact.Location = location;
                fact.UpdatedAt = DateTime.UtcNow;
            }
        }

        private async Task HandleBillCreatedAsync(StoredEvent storedEvent, JsonElement root, MiddlewareDbContext db)
        {
            var visitIdStr = root.TryGetProperty("VisitId", out var vProp) ? vProp.GetString() : null;
            var patientIdStr = root.TryGetProperty("PatientId", out var pProp) ? pProp.GetString() : null;

            if (string.IsNullOrEmpty(visitIdStr) || !Guid.TryParse(visitIdStr, out var visitId)) return;
            if (string.IsNullOrEmpty(patientIdStr) || !Guid.TryParse(patientIdStr, out var patientId)) return;

            // Resolve referrer
            var docName = root.TryGetProperty("ReferringDoctorName", out var docProp) ? docProp.GetString() : null;
            var partnerName = root.TryGetProperty("ReferralPartnerName", out var partProp) ? partProp.GetString() : null;
            var resolvedReferrer = "Direct Walk-In";
            if (!string.IsNullOrEmpty(docName)) resolvedReferrer = docName;
            else if (!string.IsNullOrEmpty(partnerName)) resolvedReferrer = partnerName;

            Guid? referringDoctorId = null;
            if (root.TryGetProperty("ReferringDoctorId", out var docIdProp) && docIdProp.ValueKind != JsonValueKind.Null && Guid.TryParse(docIdProp.GetString(), out var docId))
            {
                referringDoctorId = docId;
            }

            Guid? referralPartnerId = null;
            if (root.TryGetProperty("ReferralPartnerId", out var partIdProp) && partIdProp.ValueKind != JsonValueKind.Null && Guid.TryParse(partIdProp.GetString(), out var partId))
            {
                referralPartnerId = partId;
            }

            // Resolve Token
            var token = visitIdStr.Substring(0, 8).ToUpper(); // Fallback Token

            var visitFact = db.PatientVisitFacts.Local.FirstOrDefault(v => v.VisitId == visitId)
                            ?? await db.PatientVisitFacts.FirstOrDefaultAsync(v => v.VisitId == visitId);
            if (visitFact == null)
            {
                visitFact = new PatientVisitFact
                {
                    VisitId = visitId,
                    PatientId = patientId,
                    LabId = storedEvent.LabId,
                    Token = token,
                    VisitDate = storedEvent.OccurredAt,
                    ReferringDoctorOrPartner = resolvedReferrer,
                    ReferralPartnerId = referralPartnerId,
                    ReferringDoctorId = referringDoctorId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.PatientVisitFacts.Add(visitFact);
            }
            else
            {
                visitFact.ReferringDoctorOrPartner = resolvedReferrer;
                visitFact.ReferralPartnerId = referralPartnerId;
                visitFact.ReferringDoctorId = referringDoctorId;
                visitFact.UpdatedAt = DateTime.UtcNow;
            }

            // Update patient summary
            var patientFact = db.PatientIntelligenceFacts.Local.FirstOrDefault(p => p.PatientId == patientId)
                              ?? await db.PatientIntelligenceFacts.FirstOrDefaultAsync(p => p.PatientId == patientId);
            if (patientFact == null)
            {
                // Fallback Patient creation in case BillCreated arrives before PatientRegistered
                patientFact = new PatientIntelligenceFact
                {
                    PatientId = patientId,
                    LabId = storedEvent.LabId,
                    MRN = "Unknown MRN",
                    PatientName = "Unknown Patient",
                    MobileNumber = "Unknown Phone",
                    Gender = "Unknown",
                    ReferringDoctorOrPartner = resolvedReferrer,
                    ReferralPartnerId = referralPartnerId,
                    ReferringDoctorId = referringDoctorId,
                    LastVisitedBranchId = storedEvent.BranchId ?? string.Empty,
                    TotalVisits = 1,
                    FirstVisitDate = storedEvent.OccurredAt,
                    LastVisitDate = storedEvent.OccurredAt,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.PatientIntelligenceFacts.Add(patientFact);
            }
            else
            {
                // Count visits uniquely
                var alreadyVisited = await db.PatientVisitFacts.AnyAsync(v => v.PatientId == patientId && v.VisitId != visitId);
                if (!alreadyVisited)
                {
                    patientFact.TotalVisits = 1;
                    patientFact.FirstVisitDate = storedEvent.OccurredAt;
                    patientFact.LastVisitDate = storedEvent.OccurredAt;
                }
                else
                {
                    var localVisits = db.PatientVisitFacts.Local
                        .Where(v => v.PatientId == patientId)
                        .Select(v => v.VisitDate)
                        .ToList();
                    var dbVisits = await db.PatientVisitFacts
                        .Where(v => v.PatientId == patientId)
                        .Select(v => v.VisitDate)
                        .ToListAsync();
                    
                    var allVisits = localVisits.Concat(dbVisits).ToList();
                    
                    // Include this event occurred date
                    allVisits.Add(storedEvent.OccurredAt);

                    patientFact.TotalVisits = allVisits.Distinct().Count();
                    patientFact.FirstVisitDate = allVisits.Min();
                    patientFact.LastVisitDate = allVisits.Max();
                }

                patientFact.ReferringDoctorOrPartner = resolvedReferrer;
                patientFact.ReferralPartnerId = referralPartnerId;
                patientFact.ReferringDoctorId = referringDoctorId;
                patientFact.LastVisitedBranchId = storedEvent.BranchId ?? string.Empty;
                patientFact.UpdatedAt = DateTime.UtcNow;
            }
        }

        private async Task HandlePaymentReceivedAsync(StoredEvent storedEvent, JsonElement root, MiddlewareDbContext db)
        {
            var visitIdStr = root.TryGetProperty("VisitId", out var vProp) ? vProp.GetString() : null;
            var patientIdStr = root.TryGetProperty("PatientId", out var pProp) ? pProp.GetString() : null;
            var amountVal = root.TryGetProperty("Amount", out var amtProp) && amtProp.ValueKind != JsonValueKind.Null ? amtProp.GetDecimal() : 0m;

            if (string.IsNullOrEmpty(visitIdStr) || !Guid.TryParse(visitIdStr, out var visitId)) return;
            if (string.IsNullOrEmpty(patientIdStr) || !Guid.TryParse(patientIdStr, out var patientId)) return;

            var visitFact = db.PatientVisitFacts.Local.FirstOrDefault(v => v.VisitId == visitId)
                            ?? await db.PatientVisitFacts.FirstOrDefaultAsync(v => v.VisitId == visitId);
            if (visitFact != null)
            {
                visitFact.AmountPaid += amountVal;
                visitFact.UpdatedAt = DateTime.UtcNow;
            }

            var patientFact = db.PatientIntelligenceFacts.Local.FirstOrDefault(p => p.PatientId == patientId)
                              ?? await db.PatientIntelligenceFacts.FirstOrDefaultAsync(p => p.PatientId == patientId);
            if (patientFact != null)
            {
                var localPaid = db.PatientVisitFacts.Local
                    .Where(v => v.PatientId == patientId && v.VisitId != visitId)
                    .Sum(v => v.AmountPaid);
                var dbPaidList = await db.PatientVisitFacts
                    .Where(v => v.PatientId == patientId && v.VisitId != visitId)
                    .Select(v => v.AmountPaid)
                    .ToListAsync();
                var dbPaid = dbPaidList.Sum();
                var totalPaid = localPaid + dbPaid;
                
                patientFact.LifetimeRevenue = totalPaid + (visitFact?.AmountPaid ?? amountVal);
                patientFact.UpdatedAt = DateTime.UtcNow;
            }
        }

        private async Task HandleProcessingStartedAsync(StoredEvent storedEvent, JsonElement root, MiddlewareDbContext db)
        {
            var visitIdStr = root.TryGetProperty("VisitId", out var vProp) ? vProp.GetString() : null;
            var testCode = root.TryGetProperty("TestCode", out var tcProp) ? tcProp.GetString() : null;

            if (string.IsNullOrEmpty(visitIdStr) || !Guid.TryParse(visitIdStr, out var visitId)) return;
            if (string.IsNullOrEmpty(testCode)) return;

            var visitFact = db.PatientVisitFacts.Local.FirstOrDefault(v => v.VisitId == visitId)
                            ?? await db.PatientVisitFacts.FirstOrDefaultAsync(v => v.VisitId == visitId);
            if (visitFact != null)
            {
                List<string> tests = new List<string>();
                try
                {
                    if (!string.IsNullOrEmpty(visitFact.TestsJson))
                    {
                        tests = JsonSerializer.Deserialize<List<string>>(visitFact.TestsJson) ?? new List<string>();
                    }
                }
                catch
                {
                    tests = new List<string>();
                }

                if (!tests.Contains(testCode))
                {
                    tests.Add(testCode);
                    visitFact.TestsJson = JsonSerializer.Serialize(tests);
                    visitFact.UpdatedAt = DateTime.UtcNow;
                }
            }
        }
    }
}
