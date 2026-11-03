using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Reception;

namespace SynOS.Services.Reception
{
    public interface IReceptionPatientService
    {
        Task<IntakeRegisterPatientResponse> RegisterPatientAsync(IntakeRegisterPatientRequest request);
        Task<IEnumerable<PatientFuzzyMatchDto>> FindFuzzyMatchesAsync(string name, string? gender = null, int? age = null, DateTime? dob = null);
    }
}
