
using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using Microsoft.Extensions.Configuration;
using BCrypt.Net;

var builder = new ConfigurationBuilder().AddJsonFile("src/SynOS.Api/appsettings.json");
var config = builder.Build();

var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
optionsBuilder.UseSqlServer(config.GetConnectionString("DefaultConnection"));

using var context = new SynOSDbContext(optionsBuilder.Options);
var user = context.Users.FirstOrDefault(u => u.Email == "pathologist@lab.com");
if (user != null) {
    Console.WriteLine($"User: {user.Email}");
    Console.WriteLine($"Name: {user.Name}");
    Console.WriteLine($"PasswordHash: {user.PasswordHash}");
    
    bool matchAdmin = BCrypt.Net.BCrypt.Verify("Admin", user.PasswordHash);
    bool matchadmin = BCrypt.Net.BCrypt.Verify("admin", user.PasswordHash);
    
    Console.WriteLine($"Match 'Admin': {matchAdmin}");
    Console.WriteLine($"Match 'admin': {matchadmin}");
} else {
    Console.WriteLine("User not found!");
}
