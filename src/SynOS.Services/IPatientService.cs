using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface IPatientService
    {
        Task<Patient> CreatePatientAsync(PatientCreateDto patientDto);
        Task<IEnumerable<Patient>> SearchPatientsAsync(string query, int limit, int offset);
        Task<Patient?> GetPatientByIdAsync(Guid id);
        Task<IEnumerable<PatientPhoneHistory>> GetPatientPhoneHistoryAsync(Guid id);
        Task<Patient?> UpdatePhoneAsync(Guid patientId, string newPhone);
        Task<IEnumerable<DuplicatePatientDto>?> FindPossibleDuplicatesAsync(Guid patientId);
        Task<MergePreviewDto> GetMergePreviewAsync(Guid targetId, Guid sourceId);
        Task<bool> MergePatientsAsync(Guid targetId, Guid sourceId, Guid userId);
    }
}
