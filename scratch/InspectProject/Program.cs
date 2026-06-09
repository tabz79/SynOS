using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;

namespace SynOS.Scratch
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
            optionsBuilder.UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;MultipleActiveResultSets=true");

            using var context = new SynOSDbContext(optionsBuilder.Options);
            Console.WriteLine("Running inventory query for branchId = null...");
            try
            {
                var emptyGuid = Guid.Empty;
                var query = from lot in context.ImsInventoryLots
                            join item in context.ImsInventoryItems on lot.ItemId equals item.ItemId
                            join consumable in context.ImsConsumables on item.ItemCode equals consumable.Code into metaJoin
                            from meta in metaJoin.DefaultIfEmpty()
                            where lot.IsActive
                            group lot by new 
                            { 
                                item.ItemId, 
                                item.ItemCode, 
                                ItemName = item.Name, 
                                meta.UnitOfMeasure, 
                                meta.LowStockThreshold 
                            } into g
                            select new SynOS.Models.DTOs.IMS.InventoryStockDto
                            {
                                ItemId = g.Key.ItemId,
                                ItemName = g.Key.ItemName,
                                ItemCode = g.Key.ItemCode,
                                TotalQuantity = g.Sum(l => l.CurrentQuantity),
                                Unit = g.Key.UnitOfMeasure ?? "units",
                                BranchName = "All Branches",
                                BranchId = emptyGuid,
                                Status = g.Sum(l => l.CurrentQuantity) <= 0 ? "Critical" :
                                         g.Sum(l => l.CurrentQuantity) <= g.Key.LowStockThreshold ? "Low" : "Healthy"
                            };

                Console.WriteLine("Generated SQL:");
                Console.WriteLine(query.ToQueryString());

                var results = await query.ToListAsync();
                Console.WriteLine($"Found {results.Count} items.");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Query failed:");
                Console.WriteLine(ex.ToString());
            }
        }
    }
}
