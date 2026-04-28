
using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using Microsoft.Extensions.Configuration;

var builder = new ConfigurationBuilder().AddJsonFile("src/SynOS.Api/appsettings.json");
var config = builder.Build();

var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
optionsBuilder.UseSqlServer(config.GetConnectionString("DefaultConnection"));

using var context = new SynOSDbContext(optionsBuilder.Options);
var pathologist = context.Users.FirstOrDefault(u => u.Email == "pathologist@lab.com");
if (pathologist != null) {
    Console.WriteLine($"Pathologist Name: '{pathologist.Name}'");
} else {
    Console.WriteLine("Pathologist user not found!");
}
