using System.Threading;
using System.Threading.Tasks;
using SynOS.Data;
using SynOS.Models.Entities.Revenue;

namespace SynOS.Services.Revenue
{
    public class DiscountFactWriter : IDiscountFactWriter
    {
        private readonly SynOSDbContext _context;

        public DiscountFactWriter(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task WriteAsync(DiscountFact discountFact, CancellationToken cancellationToken = default)
        {
            _context.DiscountFacts.Add(discountFact);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
