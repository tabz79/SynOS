using System;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using SynOS.Models.Entities;
using BCrypt.Net;
using System.Collections.Generic;

namespace SynOS.Data
{
    public static class DbInitializer
    {
        public static void Initialize(SynOSDbContext context)
        {
            context.Database.EnsureCreated();

            // Seed Roles and Users if they don't exist
            if (!context.Roles.Any())
            {
                SeedRolesAndUsers(context);
            }

            // Seed Patients if they don't exist
            if (!context.Patients.Any())
            {
                SeedPatients(context);
            }
        }

        private static void SeedRolesAndUsers(SynOSDbContext context)
        {
            var roles = new Role[]
            {
                new Role{Name="Admin"},
                new Role{Name="Reception"},
                new Role{Name="PathTech"},
                new Role{Name="Pathologist"},
                new Role{Name="RadTech"},
                new Role{Name="Radiologist"},
                new Role{Name="Delivery"},
                new Role{Name="Operator"}
            };

            foreach (Role r in roles)
            {
                context.Roles.Add(r);
            }
            context.SaveChanges();

            var users = new User[]
            {
                new User{Name="Admin User", Email="admin@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin"), IsActive=true},
                new User{Name="Reception User", Email="reception@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Reception"), IsActive=true},
                new User{Name="PathTech User", Email="pathtech@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("PathTech"), IsActive=true},
                new User{Name="Pathologist User", Email="pathologist@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Pathologist"), IsActive=true},
                new User{Name="Radiologist User", Email="radiologist@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Radiologist"), IsActive=true}
            };

            foreach (User u in users)
            {
                context.Users.Add(u);
            }
            context.SaveChanges();

            var userRoles = new UserRole[]
            {
                new UserRole{UserId=users.Single(u => u.Email == "admin@lab.com").UserId, RoleId=roles.Single(r => r.Name == "Admin").Id},
                new UserRole{UserId=users.Single(u => u.Email == "reception@lab.com").UserId, RoleId=roles.Single(r => r.Name == "Reception").Id},
                new UserRole{UserId=users.Single(u => u.Email == "pathtech@lab.com").UserId, RoleId=roles.Single(r => r.Name == "PathTech").Id},
                new UserRole{UserId=users.Single(u => u.Email == "pathologist@lab.com").UserId, RoleId=roles.Single(r => r.Name == "Pathologist").Id},
                new UserRole{UserId=users.Single(u => u.Email == "radiologist@lab.com").UserId, RoleId=roles.Single(r => r.Name == "Radiologist").Id},
            };

            foreach (UserRole ur in userRoles)
            {
                context.UserRoles.Add(ur);
            }
            context.SaveChanges();
        }

        private static void SeedPatients(SynOSDbContext context)
        {
            var patients = new List<Patient>();
            for (int i = 1; i <= 10; i++)
            {
                patients.Add(new Patient
                {
                    PatientId = Guid.NewGuid(),
                    MRN = $"TC-A{i:D5}",
                    FirstName = $"Test",
                    LastName = $"Patient{i}",
                    DateOfBirth = new DateTime(1980 + i, i, i),
                    Gender = (i % 2 == 0) ? "Female" : "Male",
                    CurrentPhoneNumber = $"555-010{i-1}",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            context.Patients.AddRange(patients);
            context.SaveChanges();
        }
    }
}
