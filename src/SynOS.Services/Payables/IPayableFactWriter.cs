using SynOS.Models.Entities.Payables;

namespace SynOS.Services.Payables
{
    public interface IPayableFactWriter
    {
        void AddPayableFactToContext(PayableFact fact);
    }
}
