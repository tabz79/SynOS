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

            if (!context.Roles.Any()) SeedRolesAndUsers(context);
            if (!context.Patients.Any()) SeedPatients(context);
            if (!context.Appointments.Any()) SeedAppointments(context);
            if (!context.Visits.Any()) SeedVisitsAndTokens(context);
        }

        private static void SeedRolesAndUsers(SynOSDbContext context)
        {
            var roles = new Role[]
            {
                new Role{Name="Admin"}, new Role{Name="Reception"}, new Role{Name="PathTech"},
                new Role{Name="Pathologist"}, new Role{Name="RadTech"}, new Role{Name="Radiologist"},
                new Role{Name="Delivery"}, new Role{Name="Operator"}
            };
            context.Roles.AddRange(roles);
            context.SaveChanges();

            var users = new User[]
            {
                new User{Name="Admin User", Email="admin@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin"), IsActive=true},
                new User{Name="Reception User", Email="reception@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Reception"), IsActive=true},
                new User{Name="PathTech User", Email="pathtech@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("PathTech"), IsActive=true},
                new User{Name="Pathologist User", Email="pathologist@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Pathologist"), IsActive=true},
                new User{Name="Radiologist User", Email="radiologist@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Radiologist"), IsActive=true}
            };
            context.Users.AddRange(users);
            context.SaveChanges();

            var userRoles = new UserRole[]
            {
                new UserRole{UserId=users.Single(u => u.Email == "admin@lab.com").UserId, RoleId=roles.Single(r => r.Name == "Admin").Id},
                new UserRole{UserId=users.Single(u => u.Email == "reception@lab.com").UserId, RoleId=roles.Single(r => r.Name == "Reception").Id},
                new UserRole{UserId=users.Single(u => u.Email == "pathtech@lab.com").UserId, RoleId=roles.Single(r => r.Name == "PathTech").Id},
                new UserRole{UserId=users.Single(u => u.Email == "pathologist@lab.com").UserId, RoleId=roles.Single(r => r.Name == "Pathologist").Id},
                new UserRole{UserId=users.Single(u => u.Email == "radiologist@lab.com").UserId, RoleId=roles.Single(r => r.Name == "Radiologist").Id},
            };
            context.UserRoles.AddRange(userRoles);
            context.SaveChanges();
        }

        private static void SeedPatients(SynOSDbContext context)
        {
            var patients = new List<Patient>();
            for (int i = 1; i <= 10; i++)
            {
                patients.Add(new Patient
                {
                    PatientId = Guid.NewGuid(), MRN = $"TC-A{i:D5}", FirstName = $"Test",
                    LastName = $"Patient{i}", DateOfBirth = new DateTime(1980 + i, i, i),
                    Gender = (i % 2 == 0) ? "Female" : "Male", CurrentPhoneNumber = $"555-010{i-1}"
                });
            }
            context.Patients.AddRange(patients);
            context.SaveChanges();
        }

        private static void SeedAppointments(SynOSDbContext context)
        {
            var patient = context.Patients.First(p => p.MRN == "TC-A00001");
            var today = DateTime.UtcNow.Date;
            var appointments = new List<Appointment>
            {
                new Appointment { PatientId = patient.PatientId, ScheduledFor = today.AddDays(1).AddHours(9), Department = "Pathology", Status = AppointmentStatus.Booked },
                new Appointment { PatientId = patient.PatientId, ScheduledFor = today.AddDays(2).AddHours(11), Department = "Radiology", Status = AppointmentStatus.Booked },
                new Appointment { PatientId = context.Patients.First(p => p.MRN == "TC-A00002").PatientId, ScheduledFor = today.AddHours(10), Department = "Pathology", Status = AppointmentStatus.Booked },
                new Appointment { PatientId = context.Patients.First(p => p.MRN == "TC-A00002").PatientId, ScheduledFor = today.AddHours(15), Department = "Radiology", Status = AppointmentStatus.Booked },
            };
            context.Appointments.AddRange(appointments);
            context.SaveChanges();
        }

        private static void SeedVisitsAndTokens(SynOSDbContext context)
        {
            var patient1 = context.Patients.First(p => p.MRN == "TC-A00003");
            var patient2 = context.Patients.First(p => p.MRN == "TC-A00004");
            var patient3 = context.Patients.First(p => p.MRN == "TC-A00005");
            var today = DateTime.UtcNow.Date;

            var visits = new List<Visit>
            {
                new Visit { PatientId = patient1.PatientId, Token = "P-001", TokenDate = today, Department = "Pathology", Status = "PendingPayment" },
                new Visit { PatientId = patient2.PatientId, Token = "P-002", TokenDate = today, Department = "Pathology", Status = "Paid" },
                new Visit { PatientId = patient3.PatientId, Token = "X-001", TokenDate = today, Department = "Radiology", Status = "Cancelled" },
                new Visit { PatientId = patient1.PatientId, Token = "P-003", TokenDate = today.AddDays(-1), Department = "Pathology", Status = "Paid" },
                new Visit { PatientId = patient2.PatientId, Token = "X-002", TokenDate = today.AddDays(-1), Department = "Radiology", Status = "PendingPayment" },
            };
            context.Visits.AddRange(visits);
            context.SaveChanges();
        }
    }
}