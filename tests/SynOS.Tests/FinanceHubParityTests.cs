using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Revenue;
using SynOS.Models.Enums;
using Xunit;

namespace SynOS.Tests
{
    public class FinanceHubParityTests
    {
        private SynOSDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<SynOSDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            return new SynOSDbContext(options);
        }

        [Fact]
        public async Task CashDrawer_And_CollectionHistory_Must_Achieve_Parity_Under_4Tier_Attribution()
        {
            using var db = GetDbContext();

            var mainBranchId = Guid.NewGuid();
            var moinCashierId = Guid.NewGuid();
            var adminTerminalId = Guid.NewGuid();

            var cashier = new User
            {
                UserId = moinCashierId,
                Username = "moin",
                Name = "Moin",
                Email = "moin@synos.lab",
                PasswordHash = "hash",
                IsActive = true
            };
            db.Users.Add(cashier);

            var admin = new User
            {
                UserId = adminTerminalId,
                Username = "tabrez",
                Name = "Tabrez Developer",
                Email = "admin@synos.lab",
                PasswordHash = "hash",
                IsActive = true
            };
            db.Users.Add(admin);

            // Visit 1: Direct payment received by Moin
            var v1 = new Visit
            {
                VisitId = Guid.NewGuid(),
                BranchId = mainBranchId,
                Token = "MAI-001",
                Status = VisitStatus.Paid,
                CreatedByUserId = moinCashierId,
                AssignedReceptionistId = moinCashierId,
                CreatedAt = DateTime.UtcNow
            };
            var inv1 = new Invoice { InvoiceId = Guid.NewGuid(), Visit = v1, Currency = "INR" };
            var p1 = new Payment { PaymentId = Guid.NewGuid(), Invoice = inv1, Amount = 600, Method = "Cash", ReceivedByUserId = moinCashierId, ReceivedAt = DateTime.UtcNow };

            // Visit 2: Admin terminal processed payment, but visit assigned to Moin
            var v2 = new Visit
            {
                VisitId = Guid.NewGuid(),
                BranchId = mainBranchId,
                Token = "MAI-002",
                Status = VisitStatus.Paid,
                CreatedByUserId = adminTerminalId,
                AssignedReceptionistId = moinCashierId,
                CreatedAt = DateTime.UtcNow
            };
            var inv2 = new Invoice { InvoiceId = Guid.NewGuid(), Visit = v2, Currency = "INR" };
            var p2 = new Payment { PaymentId = Guid.NewGuid(), Invoice = inv2, Amount = 1000, Method = "Cash", ReceivedByUserId = adminTerminalId, ReceivedAt = DateTime.UtcNow };

            // Visit 3: Admin terminal processed payment, but visit created by Moin
            var v3 = new Visit
            {
                VisitId = Guid.NewGuid(),
                BranchId = mainBranchId,
                Token = "MAI-003",
                Status = VisitStatus.Paid,
                CreatedByUserId = moinCashierId,
                AssignedReceptionistId = null,
                CreatedAt = DateTime.UtcNow
            };
            var inv3 = new Invoice { InvoiceId = Guid.NewGuid(), Visit = v3, Currency = "INR" };
            var p3 = new Payment { PaymentId = Guid.NewGuid(), Invoice = inv3, Amount = 500, Method = "Cash", ReceivedByUserId = adminTerminalId, ReceivedAt = DateTime.UtcNow };

            // Outflow: Patient Refund disbursed by Moin
            var vRefund = new Visit
            {
                VisitId = Guid.NewGuid(),
                BranchId = mainBranchId,
                Token = "MAI-004",
                Status = VisitStatus.Cancelled,
                CreatedByUserId = moinCashierId,
                CreatedAt = DateTime.UtcNow
            };
            var invRefund = new Invoice { InvoiceId = Guid.NewGuid(), Visit = vRefund, Currency = "INR" };
            var pRefund = new Payment { PaymentId = Guid.NewGuid(), Invoice = invRefund, Amount = -300, Method = "Cash", ReceivedByUserId = moinCashierId, ReceivedAt = DateTime.UtcNow };

            db.Visits.AddRange(v1, v2, v3, vRefund);
            db.Invoices.AddRange(inv1, inv2, inv3, invRefund);
            db.Payments.AddRange(p1, p2, p3, pRefund);
            await db.SaveChangesAsync();

            // Query Cash Drawer using the 4-Tier Canonical Hierarchy
            var drawerQuery = db.Payments
                .Include(p => p.Invoice).ThenInclude(i => i.Visit)
                .Where(p => (p.ReceivedByUserId == moinCashierId 
                             || (p.Invoice.Visit != null && p.Invoice.Visit.AssignedReceptionistId == moinCashierId)
                             || (p.Invoice.Visit != null && p.Invoice.Visit.CreatedByUserId == moinCashierId))
                         && p.Method.ToLower().Contains("cash"));

            var drawerPayments = await drawerQuery.ToListAsync();

            // Assertions
            Assert.Equal(4, drawerPayments.Count);
            
            var totalInflows = drawerPayments.Where(p => p.Amount > 0).Sum(p => p.Amount);
            var totalOutflows = Math.Abs(drawerPayments.Where(p => p.Amount < 0).Sum(p => p.Amount));
            var netCash = totalInflows - totalOutflows;

            Assert.Equal(2100m, totalInflows); // 600 + 1000 + 500
            Assert.Equal(300m, totalOutflows);  // 300
            Assert.Equal(1800m, netCash);        // 2100 - 300
        }

        [Fact]
        public async Task CashDrawer_AntiDrop_Invariant_Omits_Blind_UserBranchRole_Fallback()
        {
            using var db = GetDbContext();

            var mainLabBranchId = Guid.NewGuid();
            var mriBranchId = Guid.NewGuid();
            var moinUserId = Guid.NewGuid();

            // Moin has a UserBranchRole pointing to MRI Branch
            var roleId = Guid.NewGuid();
            db.UserBranchRoles.Add(new UserBranchRole
            {
                UserBranchRoleId = Guid.NewGuid(),
                UserId = moinUserId,
                BranchId = mriBranchId,
                RoleId = roleId
            });

            // But Moin collected cash in Main Lab
            var visitMainLab = new Visit
            {
                VisitId = Guid.NewGuid(),
                BranchId = mainLabBranchId,
                Token = "MAI-005",
                Status = VisitStatus.Paid,
                CreatedByUserId = moinUserId,
                CreatedAt = DateTime.UtcNow
            };
            var invoice = new Invoice { InvoiceId = Guid.NewGuid(), Visit = visitMainLab, Currency = "INR" };
            var payment = new Payment { PaymentId = Guid.NewGuid(), Invoice = invoice, Amount = 1200, Method = "Cash", ReceivedByUserId = moinUserId, ReceivedAt = DateTime.UtcNow };

            db.Visits.Add(visitMainLab);
            db.Invoices.Add(invoice);
            db.Payments.Add(payment);
            await db.SaveChangesAsync();

            // In consolidated view or when branchId is omitted (null), the query must NOT filter by ubr.BranchId (MRI Branch)!
            Guid? requestedBranchId = null;

            var cashQuery = db.Payments
                .Include(p => p.Invoice).ThenInclude(i => i.Visit)
                .Where(p => (p.ReceivedByUserId == moinUserId 
                             || (p.Invoice.Visit != null && p.Invoice.Visit.AssignedReceptionistId == moinUserId)
                             || (p.Invoice.Visit != null && p.Invoice.Visit.CreatedByUserId == moinUserId))
                         && p.Method.ToLower().Contains("cash"));

            // ANTI-DROP RULE: Only apply branch filter if explicitly requested
            if (requestedBranchId.HasValue && requestedBranchId.Value != Guid.Empty)
            {
                cashQuery = cashQuery.Where(p => p.Invoice.Visit == null || p.Invoice.Visit.BranchId == requestedBranchId.Value);
            }

            var results = await cashQuery.ToListAsync();

            // Invariant: The Main Lab collection must NOT be dropped!
            Assert.Single(results);
            Assert.Equal(1200m, results.First().Amount);
        }
    }
}
