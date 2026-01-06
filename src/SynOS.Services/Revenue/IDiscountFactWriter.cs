using System;
using System.Threading;
using System.Threading.Tasks;
using SynOS.Models.Entities.Revenue;

namespace SynOS.Services.Revenue
{
    public interface IDiscountFactWriter
    {
        Task WriteAsync(DiscountFact discountFact, CancellationToken cancellationToken = default);
    }
}
