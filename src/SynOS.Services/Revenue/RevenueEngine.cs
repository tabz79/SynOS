using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Revenue;
using SynOS.Models.Enums;

namespace SynOS.Services.Revenue
{
    public interface IRevenueEngine
    {
        Task ApplySnapshotAsync(Guid visitId, Guid actorUserId);
    }

    public class RevenueEngine : IRevenueEngine
    {
        private readonly SynOSDbContext _context;

        public RevenueEngine(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task ApplySnapshotAsync(Guid visitId, Guid actorUserId)
        {
            // ⚠️ FINANCIAL INVARIANT
            // Invoice totals may ONLY be modified by IRevenueEngine
            
            var visit = await _context.Visits
                .Include(v => v.Invoices)
                .Include(v => v.Orders)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) return;

            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
            if (invoice == null) return;

            // CANONICAL FINANCIAL SOURCES
            // ------------------------------------
            // 1. Active Orders (Operational Facts)
            // 2. Active DiscountFact (Snapshot Rule)
            // 3. PriceAdjustmentFact (Financial Corrections)
            //
            // NO OTHER ENTITY MAY AFFECT FINANCIAL TOTALS

            // 1. Base Gross from Active Orders
            decimal grossAmount = visit.Orders
                .Where(o => o.Status != SynOS.Models.Enums.OrderStatus.Cancelled)
                .Sum(o => o.Price);

            // 2. Add Financial Corrections (PriceOverride)
            var adjustmentAmount = await _context.PriceAdjustmentFacts
                .Where(f => f.InvoiceId == invoice.InvoiceId)
                .SumAsync(f => f.DeltaAmount);
            
            grossAmount += adjustmentAmount;

            decimal discountAmount = 0;
            
            // 3. Discount (Latest Active - Enforced by IsActive)
            var discountFact = await _context.DiscountFacts
                .Where(df => df.InvoiceId == invoice.InvoiceId && df.IsActive)
                .OrderByDescending(df => df.AppliedAt)
                .FirstOrDefaultAsync();

            if (discountFact != null)
            {
                // RULE: Recompute derived amount based on Snapshot Rule + Current Gross.
                if (discountFact.Type == DiscountType.Percentage)
                    discountAmount = grossAmount * (discountFact.Value / 100m);
                else
                    discountAmount = discountFact.Value;

                if (discountFact.MaxLimit.HasValue && discountAmount > discountFact.MaxLimit.Value)
                    discountAmount = discountFact.MaxLimit.Value;

                if (discountAmount > grossAmount) discountAmount = grossAmount;

                // Update Derived State in Fact
                discountFact.GrossAmount = grossAmount;
                discountFact.DiscountAmount = discountAmount;
                discountFact.NetAmountAfterDiscount = grossAmount - discountAmount;
                // Note: Update not strictly needed if tracked, but explicit update is safer.
            }

            decimal netAmount = grossAmount - discountAmount;
            decimal taxAmount = netAmount * 0.05m; // 5% Hardcoded Tax Rule
            decimal totalAmount = netAmount + taxAmount;

            // MUTATE INVOICE AGGREGATE
            invoice.GrossAmount = grossAmount;
            invoice.DiscountAmount = discountAmount;
            invoice.NetAmount = netAmount;
            invoice.TaxAmount = taxAmount;
            invoice.Total = totalAmount;

            // Update Visit Status based on Payment State
            var totalPaid = invoice.Payments?.Sum(p => p.Amount) ?? 0 
                          + invoice.PartialPayments?.Sum(p => p.Amount) ?? 0
                          + _context.ChangeTracker.Entries<SynOS.Models.Entities.Payment>().Where(e => e.State == EntityState.Added).Sum(e => e.Entity.Amount);

            if (totalPaid >= totalAmount && totalAmount > 0)
            {
                invoice.Status = "Paid";
                visit.Status = "Paid";
            }
            else if (totalPaid > 0)
            {
                invoice.Status = "PartialPayment";
                visit.Status = "PartialPayment"; // Operational State
            }
            else
            {
                invoice.Status = "PendingPayment";
                // Don't revert Visit status if it's already Finalized/etc? 
                // "Visit Operational State".
                // Keep it simple: Financial status sync.
                if (visit.Status == "Paid" || visit.Status == "PartialPayment")
                    visit.Status = "PendingPayment";
            }

            await _context.SaveChangesAsync();
        }
    }
}
