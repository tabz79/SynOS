using System.Threading.Tasks;

namespace SynOS.Services
{
    public interface IAccessionService
    {
        Task<string> GenerateRadiologyAccessionNumberAsync();
    }
}
