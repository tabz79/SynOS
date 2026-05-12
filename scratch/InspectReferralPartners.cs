using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Referral;
using System;
using System.Linq;
using System.Threading.Tasks;

public class Inspector
{
    public static async Task Run(SynOSDbContext context)
    {
        var partners = await context.ReferralPartners.ToListAsync();
        Console.WriteLine("ID | Name | IsActive | Status");
        Console.WriteLine("---|---|---|---");
        foreach (var p in partners)
        {
            Console.WriteLine($"{p.ReferralPartnerId} | {p.Name} | {p.IsActive} | {p.Status}");
        }
    }
}
