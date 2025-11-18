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
        // TODO: Configure lab timezone in appsettings or a dedicated config service
        private static TimeZoneInfo _labTimeZone = TimeZoneInfo.Local; // Default to server local timezone

        public static void Initialize(SynOSDbContext context)
        {
// context.Database.EnsureCreated();

            if (!context.Roles.Any()) SeedRolesAndUsers(context);
            if (!context.TestDefinitions.Any()) SeedTestDefinitions(context);
            if (!context.Patients.Any()) SeedPatients(context);
            if (!context.Appointments.Any()) SeedAppointments(context);
            if (!context.Visits.Any()) SeedVisitsAndTokens(context);
        }

        private static void SeedRolesAndUsers(SynOSDbContext context)
        {
            var roles = new Role[]
            {
                new Role{RoleId = Guid.NewGuid(), Name="Admin"},
                new Role{RoleId = Guid.NewGuid(), Name="Reception"},
                new Role{RoleId = Guid.NewGuid(), Name="PathTech"},
                new Role{RoleId = Guid.NewGuid(), Name="Pathologist"},
                new Role{RoleId = Guid.NewGuid(), Name="RadTech"},
                new Role{RoleId = Guid.NewGuid(), Name="Radiologist"},
                new Role{RoleId = Guid.NewGuid(), Name="Delivery"},
                new Role{RoleId = Guid.NewGuid(), Name="Operator"}
            };
            context.Roles.AddRange(roles);
            context.SaveChanges();

            var users = new User[]
            {
                new User{UserId = Guid.NewGuid(), Name="Admin User", Email="admin@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin"), IsActive=true},
                new User{UserId = Guid.NewGuid(), Name="Reception User", Email="reception@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Reception"), IsActive=true},
                new User{UserId = Guid.NewGuid(), Name="PathTech User", Email="pathtech@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("PathTech"), IsActive=true},
                new User{UserId = Guid.NewGuid(), Name="Pathologist User", Email="pathologist@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Pathologist"), IsActive=true},
                new User{UserId = Guid.NewGuid(), Name="Radiologist User", Email="radiologist@lab.com", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Radiologist"), IsActive=true}
            };
            context.Users.AddRange(users);
            context.SaveChanges();

            var userRoles = new UserRole[]
            {
                new UserRole{UserId=users.Single(u => u.Email == "admin@lab.com").UserId, RoleId=roles.Single(r => r.Name == "Admin").RoleId},
                new UserRole{UserId=users.Single(u => u.Email == "reception@lab.com").UserId, RoleId=roles.Single(r => r.Name == "Reception").RoleId},
                new UserRole{UserId=users.Single(u => u.Email == "pathtech@lab.com").UserId, RoleId=roles.Single(r => r.Name == "PathTech").RoleId},
                new UserRole{UserId=users.Single(u => u.Email == "pathologist@lab.com").UserId, RoleId=roles.Single(r => r.Name == "Pathologist").RoleId},
                new UserRole{UserId=users.Single(u => u.Email == "radiologist@lab.com").UserId, RoleId=roles.Single(r => r.Name == "Radiologist").RoleId},
            };
            context.UserRoles.AddRange(userRoles);
            context.SaveChanges();
        }

        private static void SeedTestDefinitions(SynOSDbContext context)
        {
            var testDefinitions = new TestDefinition[]
            {
                new TestDefinition { TestCode = "CBC", Name = "Complete Blood Count", Department = "Pathology", Price = 150.00m, IsActive = true },
                new TestDefinition { TestCode = "FBS", Name = "Fasting Blood Sugar", Department = "Pathology", Price = 100.00m, IsActive = true },
                new TestDefinition { TestCode = "USG", Name = "Ultrasound Scan", Department = "Radiology", Price = 500.00m, IsActive = true },
                new TestDefinition { TestCode = "XRAY_CHEST", Name = "X-Ray Chest", Department = "Radiology", Price = 300.00m, IsActive = true },
                new TestDefinition { TestCode = "CT_HEAD", Name = "CT Scan Head", Department = "Radiology", Price = 1000.00m, IsActive = true },
            };
            context.TestDefinitions.AddRange(testDefinitions);
            context.SaveChanges();
        }

        private static void SeedPatients(SynOSDbContext context)
        {
            var patients = new List<Patient>();
            for (int i = 1; i <= 10; i++)
            {
                patients.Add(new Patient
                {
                    PatientId = Guid.NewGuid(), MRN = $"A{i:D5}", FirstName = $"Test",
                    LastName = $"Patient{i}", DateOfBirth = new DateTime(1980 + i, i, i),
                    Gender = (i % 2 == 0) ? "Female" : "Male", CurrentPhoneNumber = $"555-010{i-1}"
                });
            }
            context.Patients.AddRange(patients);
            context.SaveChanges();
        }

        private static void SeedAppointments(SynOSDbContext context)
        {
            var patient = context.Patients.First(p => p.MRN == "A00001");
            var today = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _labTimeZone).Date;
            var appointments = new List<Appointment>
            {
                new Appointment { PatientId = patient.PatientId, ScheduledFor = today.AddDays(1).AddHours(9), Department = "Pathology", Status = AppointmentStatus.Booked },
                new Appointment { PatientId = patient.PatientId, ScheduledFor = today.AddDays(2).AddHours(11), Department = "Radiology", Status = AppointmentStatus.Booked },
                new Appointment { PatientId = context.Patients.First(p => p.MRN == "A00002").PatientId, ScheduledFor = today.AddHours(10), Department = "Pathology", Status = AppointmentStatus.Booked },
                new Appointment { PatientId = context.Patients.First(p => p.MRN == "A00002").PatientId, ScheduledFor = today.AddHours(15), Department = "Radiology", Status = AppointmentStatus.Booked },
            };
            context.Appointments.AddRange(appointments);
            context.SaveChanges();
        }

        private static void SeedVisitsAndTokens(SynOSDbContext context)
        {
            var adminUser = context.Users.Single(u => u.Email == "admin@lab.com");
            var receptionUser = context.Users.Single(u => u.Email == "reception@lab.com");

            var patient1 = context.Patients.First(p => p.MRN == "A00003");
            var patient2 = context.Patients.First(p => p.MRN == "A00004");
            var patient3 = context.Patients.First(p => p.MRN == "A00005");
            var patient4 = context.Patients.First(p => p.MRN == "A00006");

            var labLocalToday = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _labTimeZone).Date;
            var labLocalYesterday = labLocalToday.AddDays(-1);

            // Seed TokenCounters
            var tokenCounters = new List<TokenCounter>
            {
                new TokenCounter { CounterId = Guid.NewGuid(), Department = "Pathology", Day = labLocalToday, SeriesLetter = "A", LastNumber = 2, MaxPerSeries = 999 },
                new TokenCounter { CounterId = Guid.NewGuid(), Department = "Radiology", Day = labLocalToday, SeriesLetter = "A", LastNumber = 1, MaxPerSeries = 999 },
                new TokenCounter { CounterId = Guid.NewGuid(), Department = "Pathology", Day = labLocalYesterday, SeriesLetter = "A", LastNumber = 5, MaxPerSeries = 999 },
            };
            context.TokenCounters.AddRange(tokenCounters);
            context.SaveChanges();

            // Helper to generate token (simplified for seeding)
            string GenerateTokenForSeed(string department, DateTime day, ref char seriesLetter, ref int lastNumber)
            {
                // TODO: This logic should ideally be in VisitService.GenerateDailyToken
                // This is a simplified version for seeding purposes only.
                string deptLetter = department == "Pathology" ? "P" : (department == "Radiology" ? "X" : "U");
                return $"{seriesLetter}{deptLetter}-{lastNumber:D3}";
            }

            // Seed Visits
            var visits = new List<Visit>();
            var orders = new List<Order>();
            var invoices = new List<Invoice>();
            var payments = new List<Payment>();
            var cancellations = new List<VisitCancellation>();

            // Visit 1: Pending Payment (Pathology)
            char series1 = 'A'; int num1 = 3; // Next token for Pathology today
            var visit1 = new Visit
            {
                VisitId = Guid.NewGuid(), PatientId = patient1.PatientId,
                Token = GenerateTokenForSeed("Pathology", labLocalToday, ref series1, ref num1),
                TokenDate = labLocalToday, Department = "Pathology", Status = "PendingPayment",
                CreatedAt = DateTime.UtcNow
            };
            visits.Add(visit1);
            var order1_1 = new Order { OrderId = Guid.NewGuid(), VisitId = visit1.VisitId, TestCode = "CBC", Department = "Pathology", Price = 150.00m, Discount = 0, Status = "Pending", CreatedAt = DateTime.UtcNow };
            var order1_2 = new Order { OrderId = Guid.NewGuid(), VisitId = visit1.VisitId, TestCode = "FBS", Department = "Pathology", Price = 100.00m, Discount = 0, Status = "Pending", CreatedAt = DateTime.UtcNow };
            orders.AddRange(new[] { order1_1, order1_2 });
            var invoice1 = new Invoice { InvoiceId = Guid.NewGuid(), VisitId = visit1.VisitId, GrossAmount = 250.00m, DiscountAmount = 0, NetAmount = 250.00m, TaxAmount = 12.50m, Total = 262.50m, Status = "PendingPayment", DueDate = labLocalToday.AddDays(7), CreatedAt = DateTime.UtcNow };
            invoices.Add(invoice1);

            // Visit 2: Paid (Pathology)
            char series2 = 'A'; int num2 = 4; // Next token for Pathology today
            var visit2 = new Visit
            {
                VisitId = Guid.NewGuid(), PatientId = patient2.PatientId,
                Token = GenerateTokenForSeed("Pathology", labLocalToday, ref series2, ref num2),
                TokenDate = labLocalToday, Department = "Pathology", Status = "Paid",
                CreatedAt = DateTime.UtcNow
            };
            visits.Add(visit2);
            var order2_1 = new Order { OrderId = Guid.NewGuid(), VisitId = visit2.VisitId, TestCode = "CBC", Department = "Pathology", Price = 150.00m, Discount = 0, Status = "Pending", CreatedAt = DateTime.UtcNow };
            orders.Add(order2_1);
            var invoice2 = new Invoice { InvoiceId = Guid.NewGuid(), VisitId = visit2.VisitId, GrossAmount = 150.00m, DiscountAmount = 0, NetAmount = 150.00m, TaxAmount = 7.50m, Total = 157.50m, Status = "Paid", DueDate = labLocalToday.AddDays(7), CreatedAt = DateTime.UtcNow };
            invoices.Add(invoice2);
            payments.Add(new Payment { PaymentId = Guid.NewGuid(), InvoiceId = invoice2.InvoiceId, Amount = 157.50m, Method = "Cash", ReceiptNo = "REC-001", ReceivedAt = DateTime.UtcNow, ReceivedByUserId = receptionUser.UserId });

            // Visit 3: Cancelled (Radiology)
            char series3 = 'A'; int num3 = 2; // Next token for Radiology today
            var visit3 = new Visit
            {
                VisitId = Guid.NewGuid(), PatientId = patient3.PatientId,
                Token = GenerateTokenForSeed("Radiology", labLocalToday, ref series3, ref num3),
                TokenDate = labLocalToday, Department = "Radiology", Status = "Cancelled",
                CreatedAt = DateTime.UtcNow
            };
            visits.Add(visit3);
            var order3_1 = new Order { OrderId = Guid.NewGuid(), VisitId = visit3.VisitId, TestCode = "USG", Department = "Radiology", Price = 500.00m, Discount = 0, Status = "Cancelled", CreatedAt = DateTime.UtcNow };
            orders.Add(order3_1);
            var invoice3 = new Invoice { InvoiceId = Guid.NewGuid(), VisitId = visit3.VisitId, GrossAmount = 500.00m, DiscountAmount = 0, NetAmount = 500.00m, TaxAmount = 25.00m, Total = 525.00m, Status = "Cancelled", DueDate = labLocalToday.AddDays(7), CreatedAt = DateTime.UtcNow };
            invoices.Add(invoice3);
            cancellations.Add(new VisitCancellation { CancelId = Guid.NewGuid(), VisitId = visit3.VisitId, Reason = "Patient changed mind", Notes = "Cancelled during check-in", CancelledByUserId = receptionUser.UserId, CancelledAt = DateTime.UtcNow });

            // Visit 4: Partial Payment (Radiology)
            char series4 = 'A'; int num4 = 3; // Next token for Radiology today
            var visit4 = new Visit
            {
                VisitId = Guid.NewGuid(), PatientId = patient4.PatientId,
                Token = GenerateTokenForSeed("Radiology", labLocalToday, ref series4, ref num4),
                TokenDate = labLocalToday, Department = "Radiology", Status = "PartialPayment",
                CreatedAt = DateTime.UtcNow
            };
            visits.Add(visit4);
            var order4_1 = new Order { OrderId = Guid.NewGuid(), VisitId = visit4.VisitId, TestCode = "CT_HEAD", Department = "Radiology", Price = 1000.00m, Discount = 0, Status = "Pending", CreatedAt = DateTime.UtcNow };
            orders.Add(order4_1);
            var invoice4 = new Invoice { InvoiceId = Guid.NewGuid(), VisitId = visit4.VisitId, GrossAmount = 1000.00m, DiscountAmount = 0, NetAmount = 1000.00m, TaxAmount = 50.00m, Total = 1050.00m, Status = "PartialPayment", DueDate = labLocalToday.AddDays(7), CreatedAt = DateTime.UtcNow };
            invoices.Add(invoice4);
            payments.Add(new Payment { PaymentId = Guid.NewGuid(), InvoiceId = invoice4.InvoiceId, Amount = 500.00m, Method = "Card", ReceiptNo = "REC-002", ReceivedAt = DateTime.UtcNow, ReceivedByUserId = receptionUser.UserId });


            context.Visits.AddRange(visits);
            context.Orders.AddRange(orders);
            context.Invoices.AddRange(invoices);
            context.Payments.AddRange(payments);
            context.VisitCancellations.AddRange(cancellations);
            context.SaveChanges();
        }
    }
}
