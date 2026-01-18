using System.Threading.Tasks;
using SynOS.Models.DTOs.Reception;

namespace SynOS.Services.Reception
{
    public interface IReceptionPatientService
    {
        Task<IntakeRegisterPatientResponse> RegisterPatientAsync(IntakeRegisterPatientRequest request);
    }
}