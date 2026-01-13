using System.Threading.Tasks;
using SynOS.Models.Entities.Compliance;

namespace SynOS.Services.Compliance
{
    public interface IStatutoryObligationFactWriter
    {
        Task CreateStatutoryObligationFactAsync(StatutoryObligationFact fact);
    }
}
