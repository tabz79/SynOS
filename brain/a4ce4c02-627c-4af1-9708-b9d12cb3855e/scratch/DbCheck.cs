using System;
using System.Linq;
using SynOS.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace SynOS.Scratch
{
    public class DbCheck
    {
        public static void Main(string[] args)
        {
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("src/SynOS.Api/appsettings.json")
                .Build();

            var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
            optionsBuilder.UseSqlServer(config.GetConnectionString("DefaultConnection"));

            using (var context = new SynOSDbContext(optionsBuilder.Options))
            {
                var userCount = context.Users.Count();
                Console.WriteLine($"Total Users: {userCount}");

                var biotech = context.Users.FirstOrDefault(u => u.Email == "bio.tech@synos.lab");
                if (biotech != null)
                {
                    Console.WriteLine($"User bio.tech@synos.lab exists. ID: {biotech.UserId}");
                }
                else
                {
                    Console.WriteLine("User bio.tech@synos.lab DOES NOT exist.");
                }

                var branches = context.Branches.ToList();
                foreach (var b in branches)
                {
                    Console.WriteLine($"Branch: {b.Name}, Code: '{b.Code}'");
                }
            }
        }
    }
}
