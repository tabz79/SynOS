using System;
using System.Linq;
using System.Collections.Generic;
using SynOS.Models.Entities;

namespace SynOS.Data
{
    public static class DbInitializer
    {
        // TODO: Configure lab timezone in appsettings or a dedicated config service
        private static TimeZoneInfo _labTimeZone = TimeZoneInfo.Local; // Default to server local timezone

        public static void Initialize(SynOSDbContext context)
        {
            // context.Database.EnsureCreated();

            SeedRolesAndUsers(context);
            if (!context.TestDefinitions.Any()) SeedTestDefinitions(context);
            if (!context.CriticalRules.Any()) SeedCriticalRules(context);
            if (!context.Patients.Any()) SeedPatients(context);
            if (!context.Appointments.Any()) SeedAppointments(context);

            // IMPORTANT:
            // Demo visit/token seeding was causing "Sequence contains no elements"
            // when expected seed users/patients weren’t present after schema changes.
            // For now, we disable this demo data to keep startup stable.
            //
            // if (!context.Visits.Any()) SeedVisitsAndTokens(context);

            if (!context.ReportTemplates.Any()) SeedReportTemplates(context);
        }

        private static void SeedReportTemplates(SynOSDbContext context)
        {
            // Our seeded admin user uses "admin@synos.com", not "admin@lab.com".
            // Fall back to any user if somehow that one is missing.
            var adminUser = context.Users
                                   .FirstOrDefault(u => u.Email == "admin@synos.com")
                            ?? context.Users.First();

            var templates = new ReportTemplate[]
            {
                new ReportTemplate
                {
                    TemplateId = Guid.NewGuid(),
                    Modality = "Pathology",
                    Name = "Pathology_Standard_1Column",
                    Description = "Standard one-column report for pathology results.",
                    TemplateJson = @"{
                        ""meta"": {
                            ""name"": ""Pathology_Standard_1Column"",
                            ""modality"": ""Pathology"",
                            ""layout"": ""oneColumn"",
                            ""pageSize"": ""A4"",
                            ""orientation"": ""Portrait""
                        },
                        ""sections"": [
                            { ""type"": ""Header"", ""title"": ""Pathology Report"", ""showLogo"": true },
                            { ""type"": ""PatientInfo"", ""showPatientName"": true, ""showPatientId"": true, ""showDateOfBirth"": true, ""showGender"": true, ""showContactInfo"": true },
                            { ""type"": ""ParameterTable"", ""showReferenceRanges"": true, ""highlightCriticalValues"": true },
                            { ""type"": ""Comments"", ""title"": ""Lab Comments"", ""visibleIfEmpty"": false },
                            { ""type"": ""Interpretation"", ""title"": ""Pathologist Interpretation"", ""visibleIfEmpty"": false },
                            { ""type"": ""SignatureBlock"", ""showDoctorName"": true, ""showCredentials"": true, ""showDigitalSignatureImage"": true },
                            { ""type"": ""QRCode"", ""size"": 70, ""content"": ""{ReportVerificationLink}"" },
                            { ""type"": ""Footer"", ""leftText"": ""SynOS Pathology Lab"", ""rightText"": ""Page {PageNumber} of {TotalPages}"" }
                        ]
                    }",
                    Version = 1,
                    IsPublished = true,
                    IsDefault = true,
                    IsDeleted = false,
                    CreatedBy = adminUser.UserId,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                },
                new ReportTemplate
                {
                    TemplateId = Guid.NewGuid(),
                    Modality = "Pathology",
                    Name = "Pathology_Detailed_2Column",
                    Description = "Detailed two-column report for pathology results, including recommendations.",
                    TemplateJson = @"{
                        ""meta"": {
                            ""name"": ""Pathology_Detailed_2Column"",
                            ""modality"": ""Pathology"",
                            ""layout"": ""twoColumn"",
                            ""pageSize"": ""A4"",
                            ""orientation"": ""Portrait""
                        },
                        ""sections"": [
                            { ""type"": ""Header"", ""title"": ""Detailed Pathology Report"", ""showLogo"": true },
                            { ""type"": ""PatientInfo"", ""showPatientName"": true, ""showPatientId"": true, ""showDateOfBirth"": true, ""showGender"": true },
                            { ""type"": ""ParameterTable"", ""showReferenceRanges"": true, ""highlightCriticalValues"": true },
                            { ""type"": ""Interpretation"", ""title"": ""Pathologist's Interpretation"", ""visibleIfEmpty"": true },
                            { ""type"": ""Recommendations"", ""title"": ""Recommendations"", ""visibleIfEmpty"": true },
                            { ""type"": ""SignatureBlock"", ""showDoctorName"": true, ""showCredentials"": true, ""showDigitalSignatureImage"": true },
                            { ""type"": ""Footer"", ""leftText"": ""SynOS Advanced Pathology"", ""rightText"": ""Generated on {CurrentDate}"" }
                        ]
                    }",
                    Version = 1,
                    IsPublished = false,
                    IsDefault = false,
                    IsDeleted = false,
                    CreatedBy = adminUser.UserId,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                },
                new ReportTemplate
                {
                    TemplateId = Guid.NewGuid(),
                    Modality = "Radiology",
                    Name = "Radiology_Standard",
                    Description = "Standard report for radiology findings.",
                    TemplateJson = @"{
                        ""meta"": {
                            ""name"": ""Radiology_Standard"",
                            ""modality"": ""Radiology"",
                            ""layout"": ""oneColumn"",
                            ""pageSize"": ""A4"",
                            ""orientation"": ""Portrait""
                        },
                        ""sections"": [
                            { ""type"": ""Header"", ""title"": ""Radiology Report"", ""showLogo"": true },
                            { ""type"": ""PatientInfo"", ""showPatientName"": true, ""showPatientId"": true, ""showDateOfBirth"": true, ""showGender"": true },
                            { ""type"": ""Comments"", ""title"": ""Radiologist Findings"", ""visibleIfEmpty"": false },
                            { ""type"": ""SignatureBlock"", ""showDoctorName"": true, ""showCredentials"": true, ""showDigitalSignatureImage"": true },
                            { ""type"": ""QRCode"", ""size"": 70, ""content"": ""{ReportVerificationLink}"" },
                            { ""type"": ""Footer"", ""leftText"": ""SynOS Radiology Unit"", ""rightText"": ""Page {PageNumber}"" }
                        ]
                    }",
                    Version = 1,
                    IsPublished = true,
                    IsDefault = true,
                    IsDeleted = false,
                    CreatedBy = adminUser.UserId,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                }
            };
            context.ReportTemplates.AddRange(templates);
            context.SaveChanges();
        }

        private static void SeedCriticalRules(SynOSDbContext context)
        {
            var rules = new CriticalRule[]
            {
                new CriticalRule { ParameterCode = "WBC",        CriticalLow = 2.0m,   CriticalHigh = 30.0m,  EscalationMinutes = 30, NotificationChannels = "SMS,WHATSAPP,PHONE" },
                new CriticalRule { ParameterCode = "HEMOGLOBIN", CriticalLow = 5.0m,   CriticalHigh = 20.0m,  EscalationMinutes = 30, NotificationChannels = "SMS,WHATSAPP" },
                new CriticalRule { ParameterCode = "GLUCOSE",    CriticalLow = 40.0m,  CriticalHigh = 500.0m, EscalationMinutes = 15, NotificationChannels = "SMS,EMAIL,PHONE" },
                new CriticalRule { ParameterCode = "POTASSIUM",  CriticalLow = 2.5m,   CriticalHigh = 6.5m,   EscalationMinutes = 15, NotificationChannels = "SMS,WHATSAPP,PHONE" },
                new CriticalRule { ParameterCode = "SODIUM",     CriticalLow = 120.0m, CriticalHigh = 160.0m, EscalationMinutes = 30, NotificationChannels = "SMS,EMAIL" },
            };
            context.CriticalRules.AddRange(rules);
            context.SaveChanges();
        }

        private static void SeedRolesAndUsers(SynOSDbContext context)
        {
            // --- Roles Seeding ---
            var requiredRoles = new[]
            {
                "Admin", "Receptionist", "Phlebotomist", "Pathologist",
                "XRayTech", "MriTech", "Radiologist", "DeliveryDesk"
            };
            var existingRoles = context.Roles.ToDictionary(r => r.Name, r => r);

            foreach (var roleName in requiredRoles)
            {
                if (!existingRoles.ContainsKey(roleName))
                {
                    var newRole = new Role { RoleId = Guid.NewGuid(), Name = roleName };
                    context.Roles.Add(newRole);
                    existingRoles.Add(newRole.Name, newRole);
                }
            }
            context.SaveChanges();

            // --- Users Seeding ---
            var usersToSeed = new[]
            {
                new { Email = "admin@synos.com",    Name = "System Admin",       Password = "admin123", RoleName = "Admin" },
                new { Email = "reception@lab.com",  Name = "Reception User",     Password = "Admin",    RoleName = "Receptionist" },
                new { Email = "phlebo@lab.com",     Name = "Phlebotomy User",    Password = "Admin",    RoleName = "Phlebotomist" },
                new { Email = "pathologist@lab.com",Name = "Pathologist User",   Password = "Admin",    RoleName = "Pathologist" },
                new { Email = "xray@lab.com",       Name = "X-Ray Tech User",    Password = "Admin",    RoleName = "XRayTech" },
                new { Email = "mri@lab.com",        Name = "MRI Tech User",      Password = "Admin",    RoleName = "MriTech" },
                new { Email = "radiologist@lab.com",Name = "Radiologist User",   Password = "Admin",    RoleName = "Radiologist" },
                new { Email = "delivery@lab.com",   Name = "Delivery Desk User", Password = "Admin",    RoleName = "DeliveryDesk" }
            };

            var existingUsers = context.Users.ToDictionary(u => u.Email, u => u);

            foreach (var userData in usersToSeed)
            {
                if (existingUsers.TryGetValue(userData.Email, out var existingUser))
                {
                    // Ensure password is reset for known test users
                    existingUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(userData.Password);
                }
                else
                {
                    var newUser = new User
                    {
                        UserId = Guid.NewGuid(),
                        Name = userData.Name,
                        Email = userData.Email,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(userData.Password),
                        IsActive = true
                    };
                    context.Users.Add(newUser);
                    existingUsers.Add(newUser.Email, newUser);
                }
            }
            context.SaveChanges();

            // --- UserRoles Seeding ---
            var existingUserRoles = context.UserRoles
                .Select(ur => ur.UserId + "|" + ur.RoleId)
                .ToHashSet();

            foreach (var userData in usersToSeed)
            {
                var user = existingUsers[userData.Email];
                var role = existingRoles[userData.RoleName];
                var userRoleKey = user.UserId + "|" + role.RoleId;

                if (!existingUserRoles.Contains(userRoleKey))
                {
                    context.UserRoles.Add(new UserRole { UserId = user.UserId, RoleId = role.RoleId });
                }
            }
            context.SaveChanges();
        }

        private static void SeedTestDefinitions(SynOSDbContext context)
        {
            var testDefinitions = new TestDefinition[]
            {
                new TestDefinition { TestCode = "CBC",       Name = "Complete Blood Count", Department = "Pathology", Price = 150.00m,  IsActive = true },
                new TestDefinition { TestCode = "FBS",       Name = "Fasting Blood Sugar",  Department = "Pathology", Price = 100.00m,  IsActive = true },
                new TestDefinition { TestCode = "USG",       Name = "Ultrasound Scan",      Department = "Radiology", Price = 500.00m,  IsActive = true },
                new TestDefinition { TestCode = "XRAY_CHEST",Name = "X-Ray Chest",          Department = "Radiology", Price = 300.00m,  IsActive = true },
                new TestDefinition { TestCode = "CT_HEAD",   Name = "CT Scan Head",         Department = "Radiology", Price = 1000.00m, IsActive = true },
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
                    PatientId = Guid.NewGuid(),
                    MRN = $"A{i:D5}",
                    FirstName = "Test",
                    LastName = $"Patient{i}",
                    DateOfBirth = new DateTime(1980 + i, i, i),
                    Gender = (i % 2 == 0) ? "Female" : "Male",
                    CurrentPhoneNumber = $"555-010{i - 1}"
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
                new Appointment { PatientId = patient.PatientId, ScheduledFor = today.AddDays(1).AddHours(9),  Department = "Pathology", Status = AppointmentStatus.Booked },
                new Appointment { PatientId = patient.PatientId, ScheduledFor = today.AddDays(2).AddHours(11), Department = "Radiology", Status = AppointmentStatus.Booked },
                new Appointment { PatientId = context.Patients.First(p => p.MRN == "A00002").PatientId, ScheduledFor = today.AddHours(10), Department = "Pathology", Status = AppointmentStatus.Booked },
                new Appointment { PatientId = context.Patients.First(p => p.MRN == "A00002").PatientId, ScheduledFor = today.AddHours(15), Department = "Radiology", Status = AppointmentStatus.Booked },
            };

            context.Appointments.AddRange(appointments);
            context.SaveChanges();
        }

        // NOTE: This method is kept for future use, but currently NOT called from Initialize()
        // to avoid seeding-related failures while the schema is still evolving.
        private static void SeedVisitsAndTokens(SynOSDbContext context)
        {
            var adminUser = context.Users.FirstOrDefault(u => u.Email == "admin@synos.com");
            var receptionUser = context.Users.FirstOrDefault(u => u.Email == "reception@lab.com");

            if (adminUser == null || receptionUser == null)
            {
                // Required seed users not present – skip demo visit/token seeding.
                return;
            }

            var patient1 = context.Patients.FirstOrDefault(p => p.MRN == "A00003");
            var patient2 = context.Patients.FirstOrDefault(p => p.MRN == "A00004");
            var patient3 = context.Patients.FirstOrDefault(p => p.MRN == "A00005");
            var patient4 = context.Patients.FirstOrDefault(p => p.MRN == "A00006");

            if (patient1 == null || patient2 == null || patient3 == null || patient4 == null)
            {
                // Patients not present as expected – skip demo data to avoid exceptions.
                return;
            }

            var labLocalToday = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _labTimeZone).Date;
            var labLocalYesterday = labLocalToday.AddDays(-1);

            var tokenCounters = new List<TokenCounter>
            {
                new TokenCounter { CounterId = Guid.NewGuid(), Department = "Pathology", Day = labLocalToday,    SeriesLetter = "A", LastNumber = 2, MaxPerSeries = 999 },
                new TokenCounter { CounterId = Guid.NewGuid(), Department = "Radiology", Day = labLocalToday,    SeriesLetter = "A", LastNumber = 1, MaxPerSeries = 999 },
                new TokenCounter { CounterId = Guid.NewGuid(), Department = "Pathology", Day = labLocalYesterday,SeriesLetter = "A", LastNumber = 5, MaxPerSeries = 999 },
            };
            context.TokenCounters.AddRange(tokenCounters);
            context.SaveChanges();

            string GenerateTokenForSeed(string department, DateTime day, ref char seriesLetter, ref int lastNumber)
            {
                string deptLetter = department == "Pathology" ? "P"
                                  : department == "Radiology" ? "X"
                                  : "U";
                return $"{seriesLetter}{deptLetter}-{lastNumber:D3}";
            }

            var visits = new List<Visit>();
            var orders = new List<Order>();
            var invoices = new List<Invoice>();
            var payments = new List<Payment>();
            var cancellations = new List<VisitCancellation>();

            // Visit 1: Pending Payment (Pathology)
            char series1 = 'A'; int num1 = 3;
            var visit1 = new Visit
            {
                VisitId = Guid.NewGuid(),
                PatientId = patient1.PatientId,
                Token = GenerateTokenForSeed("Pathology", labLocalToday, ref series1, ref num1),
                TokenDate = labLocalToday,
                Department = "Pathology",
                Status = "PendingPayment",
                CreatedAt = DateTime.UtcNow
            };
            visits.Add(visit1);
            var order1_1 = new Order { OrderId = Guid.NewGuid(), VisitId = visit1.VisitId, TestCode = "CBC", Department = "Pathology", Price = 150.00m, Discount = 0, Status = "Pending",   CreatedAt = DateTime.UtcNow };
            var order1_2 = new Order { OrderId = Guid.NewGuid(), VisitId = visit1.VisitId, TestCode = "FBS", Department = "Pathology", Price = 100.00m, Discount = 0, Status = "Pending",   CreatedAt = DateTime.UtcNow };
            orders.AddRange(new[] { order1_1, order1_2 });
            var invoice1 = new Invoice { InvoiceId = Guid.NewGuid(), VisitId = visit1.VisitId, GrossAmount = 250.00m, DiscountAmount = 0, NetAmount = 250.00m, TaxAmount = 12.50m, Total = 262.50m, Status = "PendingPayment", DueDate = labLocalToday.AddDays(7), CreatedAt = DateTime.UtcNow };
            invoices.Add(invoice1);

            // Visit 2: Paid (Pathology)
            char series2 = 'A'; int num2 = 4;
            var visit2 = new Visit
            {
                VisitId = Guid.NewGuid(),
                PatientId = patient2.PatientId,
                Token = GenerateTokenForSeed("Pathology", labLocalToday, ref series2, ref num2),
                TokenDate = labLocalToday,
                Department = "Pathology",
                Status = "Paid",
                CreatedAt = DateTime.UtcNow
            };
            visits.Add(visit2);
            var order2_1 = new Order { OrderId = Guid.NewGuid(), VisitId = visit2.VisitId, TestCode = "CBC", Department = "Pathology", Price = 150.00m, Discount = 0, Status = "Pending", CreatedAt = DateTime.UtcNow };
            orders.Add(order2_1);
            var invoice2 = new Invoice { InvoiceId = Guid.NewGuid(), VisitId = visit2.VisitId, GrossAmount = 150.00m, DiscountAmount = 0, NetAmount = 150.00m, TaxAmount = 7.50m, Total = 157.50m, Status = "Paid", DueDate = labLocalToday.AddDays(7), CreatedAt = DateTime.UtcNow };
            invoices.Add(invoice2);
            payments.Add(new Payment { PaymentId = Guid.NewGuid(), InvoiceId = invoice2.InvoiceId, Amount = 157.50m, Method = "Cash", ReceiptNo = "REC-001", ReceivedAt = DateTime.UtcNow, ReceivedByUserId = receptionUser.UserId });

            // Visit 3: Cancelled (Radiology)
            char series3 = 'A'; int num3 = 2;
            var visit3 = new Visit
            {
                VisitId = Guid.NewGuid(),
                PatientId = patient3.PatientId,
                Token = GenerateTokenForSeed("Radiology", labLocalToday, ref series3, ref num3),
                TokenDate = labLocalToday,
                Department = "Radiology",
                Status = "Cancelled",
                CreatedAt = DateTime.UtcNow
            };
            visits.Add(visit3);
            var order3_1 = new Order { OrderId = Guid.NewGuid(), VisitId = visit3.VisitId, TestCode = "USG", Department = "Radiology", Price = 500.00m, Discount = 0, Status = "Cancelled", CreatedAt = DateTime.UtcNow };
            orders.Add(order3_1);
            var invoice3 = new Invoice { InvoiceId = Guid.NewGuid(), VisitId = visit3.VisitId, GrossAmount = 500.00m, DiscountAmount = 0, NetAmount = 500.00m, TaxAmount = 25.00m, Total = 525.00m, Status = "Cancelled", DueDate = labLocalToday.AddDays(7), CreatedAt = DateTime.UtcNow };
            invoices.Add(invoice3);
            cancellations.Add(new VisitCancellation { CancelId = Guid.NewGuid(), VisitId = visit3.VisitId, Reason = "Patient changed mind", Notes = "Cancelled during check-in", CancelledByUserId = receptionUser.UserId, CancelledAt = DateTime.UtcNow });

            // Visit 4: Partial Payment (Radiology)
            char series4 = 'A'; int num4 = 3;
            var visit4 = new Visit
            {
                VisitId = Guid.NewGuid(),
                PatientId = patient4.PatientId,
                Token = GenerateTokenForSeed("Radiology", labLocalToday, ref series4, ref num4),
                TokenDate = labLocalToday,
                Department = "Radiology",
                Status = "PartialPayment",
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
