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

            // 1. INVARIANT: Explicit Identity Creation
            // We removed the "Check Existing Phone" block. 
            // RegisterPatient = Create New Patient. Always.
            // The Frontend Search is responsible for displaying existing patients.

            // 2. Name Handling (Culturally Safe)
            // Legacy columns (FirstName/LastName) are required, so we provide safe defaults derived from input.
            // DisplayName is the source of truth.
            var rawName = request.Name?.Trim() ?? "Unknown";
            var names = rawName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            var firstName = names.Length > 0 ? names[0] : "Unknown";
            var lastName = names.Length > 1 ? names[1] : "Patient"; // Default if mononym

            // 3. Generate MRN (Canonical Authority via Sequence + Base36)
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
            
            // Ensure phone history is initialized if phone is present
             if (!string.IsNullOrEmpty(request.Phone))
            {
                 patient.PhoneHistory = new System.Collections.Generic.List<PatientPhoneHistory>
                {
                    new PatientPhoneHistory
                    {
                        PhoneNumber = request.Phone,
                        StartDate = DateTime.UtcNow
                    }
                };
            }

            _context.Patients.Add(patient);
            await _context.SaveChangesAsync();

            return new IntakeRegisterPatientResponse 
            { 
                PatientId = patient.PatientId,
                MRN = patient.MRN 
            };
        }

        private async Task<string> GenerateCanonicalMrnAsync()
        {
            // CANONICAL FIX: Order by MRN descending to find the actual highest sequence
            // CreatedAt is unreliable if multiple records are seeded/imported at once.
            var last = await _context.Patients
                .OrderByDescending(p => p.MRN)
                .Select(p => p.MRN)
                .FirstOrDefaultAsync();

            long nextVal = 1;
            if (!string.IsNullOrEmpty(last))
            {
                try 
                {
                    long lastVal = Base36ToInt(last);
                    
                    // FORCE ALPHA VISUALIZATION:
                    // If the existing sequence is purely numeric (e.g. 100009), 
                    // users don't "believe" it's Base36. 
                    // We JUMP the sequence to the first purely Alpha-looking range.
                    // 'A00000' in Base36 is approx 604,661,760. 
                    // We check if current value is low (numeric range) and boost it.
                    
                    long alphaThreshold = 604661760; // Value for 'A00000'
                    if (lastVal < alphaThreshold && lastVal < 2000000) // 2M is safe buffer for numeric legacy
                    {
                         nextVal = alphaThreshold + 1;
                    }
                    else
                    {
                        nextVal = lastVal + 1;
                    }
                }
                catch 
                {
                     nextVal = 604661761; // Safety Fallback to 'A00001'
                }
            }
            else
            {
                 nextVal = 604661761; // Start at 'A00001' for brand new DB
            }

            // DEFENSIVE CHECK: Ensure the generated MRN doesn't already exist
            // This handles cases where manual entries might have fragmented the sequence.
            string candidateMrn = IntToBase36(nextVal).PadLeft(6, '0');
            bool exists = await _context.Patients.AnyAsync(p => p.MRN == candidateMrn);
            int safetyCounter = 0;

            while (exists && safetyCounter < 100)
            {
                nextVal++;
                candidateMrn = IntToBase36(nextVal).PadLeft(6, '0');
                exists = await _context.Patients.AnyAsync(p => p.MRN == candidateMrn);
                safetyCounter++;
            }

            return candidateMrn;
        }

        private static string IntToBase36(long value)
        {
            const string chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            if (value == 0) return "0";

            var result = new System.Text.StringBuilder();
            while (value > 0)
            {
                result.Insert(0, chars[(int)(value % 36)]);
                value /= 36;
            }
            return result.ToString();
        }

        private static long Base36ToInt(string input)
        {
            const string chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            var normalized = input.Trim().ToUpper();
            long result = 0;
            foreach (var c in normalized)
            {
                var val = chars.IndexOf(c);
                if (val == -1) return 0; 
                result = result * 36 + val;
            }
            return result;
        }
    }
}
