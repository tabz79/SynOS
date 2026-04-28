
using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;

var builder = new ConfigurationBuilder()
    .AddJsonFile("src/SynOS.Api/appsettings.json");
var config = builder.Build();

var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
optionsBuilder.UseSqlServer(config.GetConnectionString("DefaultConnection"));

using var context = new SynOSDbContext(optionsBuilder.Options);
var users = context.Users.Select(u => new { u.Email, u.Name }).ToList();
foreach (var u in users) {
    Console.WriteLine($"{u.Email}: {u.Name}");
}
