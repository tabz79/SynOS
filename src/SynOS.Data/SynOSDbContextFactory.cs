using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace SynOS.Data
{
    public class SynOSDbContextFactory : IDesignTimeDbContextFactory<SynOSDbContext>
    {
        public SynOSDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
            
            // Hardcoded for Dev-Time Safety or read from environment
            // In a real scenario, we might build configuration, but for this specific "Synthesized" env,
            // we use the known local connection string to guarantee success.
            var connectionString = "Server=(localdb)\\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;MultipleActiveResultSets=true";

            optionsBuilder.UseSqlServer(connectionString);

            return new SynOSDbContext(optionsBuilder.Options);
        }
    }
}
