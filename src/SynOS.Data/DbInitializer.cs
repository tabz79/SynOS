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
            // The following seeding methods for TestDefinitions, etc. are now obsolete
            // and should be removed or updated to use the new Test entity structure.
            // For now, we will leave them as is to avoid further breaking changes.
            // if (!context.TestDefinitions.Any()) SeedTestDefinitions(context);
            if (!context.CriticalRules.Any()) SeedCriticalRules(context);
            if (!context.Patients.Any()) SeedPatients(context);
            if (!context.Appointments.Any()) SeedAppointments(context);

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
            // Corrected Admin UserId to be a fixed GUID
            var adminUserId = Guid.Parse("721985c7-bbae-4368-a958-8b724082f532");

            var usersToSeed = new[]
            {
                new { UserId = adminUserId, Email = "admin@synos.com",    Name = "System Admin",       Password = "admin123", RoleName = "Admin" },
                new { UserId = Guid.NewGuid(), Email = "reception@lab.com",  Name = "Reception User",     Password = "Admin",    RoleName = "Receptionist" },
                new { UserId = Guid.NewGuid(), Email = "phlebo@lab.com",     Name = "Phlebotomy User",    Password = "Admin",    RoleName = "Phlebotomist" },
                new { UserId = Guid.NewGuid(), Email = "pathologist@lab.com",Name = "Pathologist User",   Password = "Admin",    RoleName = "Pathologist" },
                new { UserId = Guid.NewGuid(), Email = "xray@lab.com",       Name = "X-Ray Tech User",    Password = "Admin",    RoleName = "XRayTech" },
                new { UserId = Guid.NewGuid(), Email = "mri@lab.com",        Name = "MRI Tech User",      Password = "Admin",    RoleName = "MriTech" },
                new { UserId = Guid.NewGuid(), Email = "radiologist@lab.com",Name = "Radiologist User",   Password = "Admin",    RoleName = "Radiologist" },
                new { UserId = Guid.NewGuid(), Email = "delivery@lab.com",   Name = "Delivery Desk User", Password = "Admin",    RoleName = "DeliveryDesk" }
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
                        UserId = userData.UserId, // Use predefined UserId
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

        // SeedTestDefinitions is now obsolete due to the new Test Master module and CSV import.
        // It is left here for reference but should not be used.
        private static void SeedTestDefinitions(SynOSDbContext context)
        {
            // This method is obsolete.
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
    }
}