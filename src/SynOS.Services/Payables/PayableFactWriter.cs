using System;
using SynOS.Data;
using SynOS.Models.Entities.Payables;

namespace SynOS.Services.Payables
{
    public class PayableFactWriter : IPayableFactWriter
    {
        private readonly SynOSDbContext _context;

        public PayableFactWriter(SynOSDbContext context)
        {
            _context = context;
        }

        public void AddPayableFactToContext(PayableFact fact)
        {
            if (fact == null) throw new ArgumentNullException(nameof(fact));
            _context.PayableFacts.Add(fact);
        }
    }
}
