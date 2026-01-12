using System.Threading.Tasks;
using SynOS.Models.Entities.SpendEngine;

namespace SynOS.Services.SpendEngine
{
    public interface ISpendFactWriter
    {
        Task CreateSpendFactAsync(SpendFact fact);
    }
}
