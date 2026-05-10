using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Referral;

var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
optionsBuilder.UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;MultipleActiveResultSets=true");

using var context = new SynOSDbContext(optionsBuilder.Options);

var partnerId = Guid.Parse("745502d5-4922-4828-b853-ed8c781c36ac");
var partner = context.ReferralPartners.Find(partnerId);

if (partner == null)
{
    Console.WriteLine($"PARTNER_NOT_FOUND: {partnerId}");
}
else
{
    Console.WriteLine($"PARTNER_FOUND: {partner.Name}");
}

var facts = context.ReferralPayableFacts
    .Where(f => f.ReferralPartnerId == partnerId)
    .ToList();

Console.WriteLine($"FACTS_COUNT: {facts.Count}");
foreach (var f in facts)
{
    Console.WriteLine($"FACT: ID={f.ReferralPayableFactId}, SettledAt={f.SettledAt}, Status={f.Status}, Amount={f.Amount}");
}
