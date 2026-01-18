using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Reception;
using SynOS.Models.Entities;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SynOS.Services.Reception
{
    public class ReceptionPatientService : IReceptionPatientService
    {
        private readonly SynOSDbContext _context;

        public ReceptionPatientService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<IntakeRegisterPatientResponse> RegisterPatientAsync(IntakeRegisterPatientRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Phone))
            {
                throw new ArgumentException("Phone number is required for registration.");
            }

            // 1. Idempotency Check (Phone is Global Identity)
            // Patients are global across branches. Phone number uniquely identifies a patient.
            var existingPatient = await _context.Patients
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.CurrentPhoneNumber == request.Phone && !p.IsSoftDeleted);

            if (existingPatient != null)
            {
                return new IntakeRegisterPatientResponse { PatientId = existingPatient.PatientId };
            }

            // 2. Name Handling (Culturally Safe)
            // Legacy columns (FirstName/LastName) are required, so we provide safe defaults derived from input.
            // DisplayName is the source of truth.
            var rawName = request.Name?.Trim() ?? "Unknown";
            var names = rawName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            var firstName = names.Length > 0 ? names[0] : "Unknown";
            var lastName = names.Length > 1 ? names[1] : "Patient"; // Default if mononym

            // 3. Generate MRN (Canonical Authority via Sequence)
            var nextMrn = await GenerateCanonicalMrnAsync();

            // 4. Create Entity
            var patient = new Patient
            {
                PatientId = Guid.NewGuid(),
                MRN = nextMrn,
                DisplayName = rawName,
                FirstName = firstName,
                LastName = lastName,
                DateOfBirth = request.Dob ?? new DateTime(1900, 1, 1),
                IsDateOfBirthKnown = request.Dob.HasValue,
                Gender = request.Gender ?? "Unknown",
                CurrentPhoneNumber = request.Phone,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Patients.Add(patient);
            await _context.SaveChangesAsync();

            return new IntakeRegisterPatientResponse { PatientId = patient.PatientId };
        }

        private async Task<string> GenerateCanonicalMrnAsync()
        {
            // Use SQL Sequence for atomic, safe generation
            var result = await _context.Database.SqlQueryRaw<long>("SELECT NEXT VALUE FOR PATIENT_MRN_SEQ as Value").ToListAsync();
            var seqVal = result.First();
            return seqVal.ToString().PadLeft(6, '0');
        }
    }
}
