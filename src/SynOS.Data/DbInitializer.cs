using System;
using System.Linq;
using System.Collections.Generic;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Operations;

namespace SynOS.Data
{
    public static class DbInitializer
    {
        // TODO: Configure lab timezone in appsettings or a dedicated config service
        private static TimeZoneInfo _labTimeZone = TimeZoneInfo.Local; // Default to server local timezone

        // Define a static DefaultBranchId for seeding purposes
        public static readonly Guid DefaultBranchId = Guid.Parse("A0000000-0000-0000-0000-000000000001"); // Example GUID

        public static void Initialize(SynOSDbContext context)
        {
            // context.Database.EnsureCreated();
            
            SeedBranches(context); // Seed branches first
            SeedRolesAndUsers(context);
            SeedLabProfile(context);

            SeedSpecimenTypes(context);
            SeedTubes(context);
            
            // The following seeding methods for TestDefinitions, etc. are now obsolete
            // and should be removed or updated to use the new Test entity structure.
            // For now, we will leave them as is to avoid further breaking changes.
            // if (!context.TestDefinitions.Any()) SeedTestDefinitions(context);
            if (!context.CriticalRules.Any()) SeedCriticalRules(context);
            if (!context.Patients.Any()) SeedPatients(context);
            if (!context.Appointments.Any()) SeedAppointments(context);

            if (!context.OperationalResources.Any()) SeedOperationalResources(context);

            if (!context.ReportTemplates.Any()) SeedReportTemplates(context);

            // Phase 2 & 3: Seed Catalog Masters from existing data / defaults
            CatalogSeedService.SeedProcessingDepartmentsAsync(context).GetAwaiter().GetResult();
            CatalogSeedService.SeedSpecimenTypesAsync(context).GetAwaiter().GetResult();
            CatalogSeedService.SeedTubeTypesAsync(context).GetAwaiter().GetResult();
        }

        private static void SeedBranches(SynOSDbContext context)
        {
            // We no longer return early here. We check individual records to allow updates/missing data.
            var defaultBranch = context.Branches.FirstOrDefault(b => b.BranchId == DefaultBranchId);
            if (defaultBranch == null)
            {
                defaultBranch = new Branch
                {
                    BranchId = DefaultBranchId,
                    Code = "MAIN",
                    Name = "Main Laboratory",
                    IsActive = true
                };
                context.Branches.Add(defaultBranch);
                Console.WriteLine("[DbInitializer] SEEDED DEFAULT BRANCH");
            }
            else if (string.IsNullOrEmpty(defaultBranch.Code))
            {
                defaultBranch.Code = "MAIN";
                Console.WriteLine("[DbInitializer] UPDATED DEFAULT BRANCH WITH CODE 'MAIN'");
            }
            
            context.SaveChanges();
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
                "Admin", "Receptionist", "Phlebotomist", "Pathologist", "Technician",
                "XRayTech", "MriTech", "Radiologist", "DeliveryDesk", "Typist", "LabTech"
            };
            var existingRoles = context.Roles.ToDictionary(r => r.Name, r => r);

            foreach (var roleName in requiredRoles)
            {
                if (!existingRoles.ContainsKey(roleName))
                {
                    var newRole = new Role { RoleId = Guid.NewGuid(), Name = roleName };
                    context.Roles.Add(newRole);
                    existingRoles.Add(newRole.Name, newRole);
                    Console.WriteLine($"[DbInitializer] CREATED NEW ROLE: {roleName}");
                }
            }
            context.SaveChanges();

            // --- Users Seeding ---
            // Corrected Admin UserId to be a fixed GUID
            var adminUserId = Guid.Parse("721985c7-bbae-4368-a958-8b724082f532");

            var usersToSeed = new[]
            {
                new { UserId = adminUserId, Email = "admin@synos.com",    Name = "System Admin",       Password = "admin123", RoleName = "Admin", CanUseOperational = true, CanUseOversight = true },
                new { UserId = Guid.NewGuid(), Email = "reception@lab.com",  Name = "Reception User",     Password = "Admin",    RoleName = "Receptionist", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Email = "phlebo@lab.com",     Name = "Phlebotomy User",    Password = "Admin",    RoleName = "Phlebotomist", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.Parse("A30F52D6-60E5-4834-9BF1-8C4E56AB3956"), Email = "pathologist@lab.com",Name = "Pathologist User",   Password = "Admin",    RoleName = "Pathologist", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Email = "xray@lab.com",       Name = "X-Ray Tech User",    Password = "Admin",    RoleName = "XRayTech", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Email = "mri@lab.com",        Name = "MRI Tech User",      Password = "Admin",    RoleName = "MriTech", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Email = "radiologist@lab.com",Name = "Radiologist User",   Password = "Admin",    RoleName = "Radiologist", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Email = "delivery@lab.com",   Name = "Delivery Desk User", Password = "Admin",    RoleName = "DeliveryDesk", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Email = "pathologist2@lab.com", Name = "Dr. Sarah Williams", Password = "Admin", RoleName = "Pathologist", CanUseOperational = true, CanUseOversight = false },
                
                // Simulator Specific Users (GPT-5 Mandatory: Role Purity)
                new { UserId = Guid.NewGuid(), Email = "typist1@lab.com",    Name = "Simulator Typist",   Password = "Admin",    RoleName = "Typist", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Email = "bio.tech@synos.lab", Name = "Simulator Bio Tech", Password = "Admin",    RoleName = "LabTech", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Email = "hemtech@synos.lab",  Name = "Simulator Hem Tech", Password = "Admin",    RoleName = "LabTech", CanUseOperational = true, CanUseOversight = false }
            };

            var existingUsers = context.Users.ToDictionary(u => u.Email, u => u, StringComparer.OrdinalIgnoreCase);

            foreach (var userData in usersToSeed)
            {
                // Try to find user by Email (case-insensitive) OR by UserId
                var user = existingUsers.TryGetValue(userData.Email, out var matchByEmail) 
                    ? matchByEmail 
                    : context.Users.Local.FirstOrDefault(u => u.UserId == userData.UserId) ?? context.Users.FirstOrDefault(u => u.UserId == userData.UserId);

                if (user != null)
                {
                    // Update existing user
                    user.Name = userData.Name; // Sync Name to clear any stale identity artifacts
                    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(userData.Password);
                    user.CanUseOperationalMode = userData.CanUseOperational;
                    user.CanUseOversightMode = userData.CanUseOversight;
                    
                    // Force designation if missing or if it's one of our seeded users
                    if (string.IsNullOrEmpty(user.Designation) || userData.Email.Contains("@lab.com") || userData.Email == "admin@synos.com")
                    {
                        user.Designation = userData.Email == "admin@synos.com" ? "Chief Pathologist" :
                                           userData.Email == "pathologist@lab.com" ? "Consultant Pathologist" :
                                           userData.Email == "radiologist@lab.com" ? "Consultant Radiologist" : user.Designation;
                    }
                }
                else
                {
                    var newUser = new User
                    {
                        UserId = userData.UserId, // Use predefined UserId
                        Name = userData.Name,
                        Email = userData.Email,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(userData.Password),
                        IsActive = true,
                        Designation = userData.Email == "admin@synos.com" ? "Chief Pathologist" :
                                      userData.Email == "pathologist@lab.com" ? "Consultant Pathologist" :
                                      userData.Email == "radiologist@lab.com" ? "Consultant Radiologist" : null,
                        IsDefaultSignatory = userData.Email == "admin@synos.com",
                        CanUseOperationalMode = userData.CanUseOperational,
                        CanUseOversightMode = userData.CanUseOversight
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

            // --- UserBranchRoles Seeding (Multi-Branch Auth) ---
            var existingUserBranchRoles = context.UserBranchRoles
                .Select(ubr => ubr.UserId + "|" + ubr.BranchId + "|" + ubr.RoleId)
                .ToHashSet();

            foreach (var userData in usersToSeed)
            {
                var user = existingUsers[userData.Email];
                var role = existingRoles[userData.RoleName];
                var userRoleKey = user.UserId + "|" + role.RoleId;

                // Legacy seeding (Deprecated)
                if (!existingUserRoles.Contains(userRoleKey))
                {
                    context.UserRoles.Add(new UserRole { UserId = user.UserId, RoleId = role.RoleId });
                }

                // New Multi-branch seeding
                var branchKey = user.UserId + "|" + DefaultBranchId + "|" + role.RoleId;
                if (!existingUserBranchRoles.Contains(branchKey))
                {
                    context.UserBranchRoles.Add(new UserBranchRole 
                    { 
                        UserBranchRoleId = Guid.NewGuid(),
                        UserId = user.UserId, 
                        BranchId = DefaultBranchId, 
                        RoleId = role.RoleId 
                    });
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

        private static void SeedOperationalResources(SynOSDbContext context)
        {
            var phleboUser = context.Users.FirstOrDefault(u => u.Email == "phlebo@lab.com");
            var xrayUser = context.Users.FirstOrDefault(u => u.Email == "xray@lab.com");
            var pathUser = context.Users.FirstOrDefault(u => u.Email == "pathologist@lab.com");

            if (phleboUser != null)
            {
                context.OperationalResources.Add(new OperationalResource
                {
                    OperationalResourceId = Guid.NewGuid(),
                    UserId = phleboUser.UserId,
                    Role = "Phlebotomist",
                    DepartmentCode = "Pathology",
                    IsOnline = true,
                    IsActive = true,
                    PhysicalStation = "Desk 1",
                    LastHeartbeat = DateTime.UtcNow,
                    BranchId = DefaultBranchId
                });
            }

            if (pathUser != null)
            {
                context.OperationalResources.Add(new OperationalResource
                {
                    OperationalResourceId = Guid.NewGuid(),
                    UserId = pathUser.UserId,
                    Role = "Pathologist",
                    DepartmentCode = "Pathology",
                    IsOnline = true,
                    IsActive = true,
                    PhysicalStation = "Consultation 1",
                    LastHeartbeat = DateTime.UtcNow,
                    BranchId = DefaultBranchId
                });
            }

            if (xrayUser != null)
            {
                context.OperationalResources.Add(new OperationalResource
                {
                    OperationalResourceId = Guid.NewGuid(),
                    UserId = xrayUser.UserId,
                    Role = "XRayTech",
                    DepartmentCode = "Radiology",
                    IsOnline = true,
                    IsActive = true,
                    PhysicalStation = "Room 302",
                    LastHeartbeat = DateTime.UtcNow,
                    BranchId = DefaultBranchId
                });
            }

            context.SaveChanges();
        }

        private static void SeedSpecimenTypes(SynOSDbContext context)
        {
            var types = new[]
            {
                new SpecimenType { Code = "SERUM", Name = "Serum", ContainerCategory = "Blood", IsActive = true, CreatedAt = DateTimeOffset.UtcNow },
                new SpecimenType { Code = "EDTA", Name = "EDTA Whole Blood", ContainerCategory = "Blood", IsActive = true, CreatedAt = DateTimeOffset.UtcNow },
                new SpecimenType { Code = "PLASMA", Name = "Plasma", ContainerCategory = "Blood", IsActive = true, CreatedAt = DateTimeOffset.UtcNow },
                new SpecimenType { Code = "URINE", Name = "Urine", ContainerCategory = "Urine", IsActive = true, CreatedAt = DateTimeOffset.UtcNow },
                new SpecimenType { Code = "CSF", Name = "Cerebrospinal Fluid", ContainerCategory = "Other", IsActive = true, CreatedAt = DateTimeOffset.UtcNow },
                new SpecimenType { Code = "SST", Name = "Serum Separator Tube", ContainerCategory = "Blood", IsActive = true, CreatedAt = DateTimeOffset.UtcNow },
                new SpecimenType { Code = "SWAB", Name = "Swab", ContainerCategory = "Other", IsActive = true, CreatedAt = DateTimeOffset.UtcNow }
            };
            foreach (var type in types)
            {
                if (!context.SpecimenTypes.Any(s => s.Code == type.Code))
                {
                    context.SpecimenTypes.Add(type);
                }
            }
            context.SaveChanges();
        }

        private static void SeedTubes(SynOSDbContext context)
        {
            var tubes = new[]
            {
                new SynOS.Models.Entities.IMS.ImsTubeMaster { TubeId = Guid.NewGuid(), Code = "SST", Name = "SST (Yellow)", UnitOfMeasure = "each", IsActive = true },
                new SynOS.Models.Entities.IMS.ImsTubeMaster { TubeId = Guid.NewGuid(), Code = "EDTA", Name = "EDTA (Purple)", UnitOfMeasure = "each", IsActive = true },
                new SynOS.Models.Entities.IMS.ImsTubeMaster { TubeId = Guid.NewGuid(), Code = "FLUORIDE", Name = "Fluoride (Grey)", UnitOfMeasure = "each", IsActive = true },
                new SynOS.Models.Entities.IMS.ImsTubeMaster { TubeId = Guid.NewGuid(), Code = "CITRATE", Name = "Citrate (Blue)", UnitOfMeasure = "each", IsActive = true },
                new SynOS.Models.Entities.IMS.ImsTubeMaster { TubeId = Guid.NewGuid(), Code = "PLAIN", Name = "Plain (Red)", UnitOfMeasure = "each", IsActive = true },
                new SynOS.Models.Entities.IMS.ImsTubeMaster { TubeId = Guid.NewGuid(), Code = "PLAIN_RED", Name = "Plain (Red)", UnitOfMeasure = "each", IsActive = true },
                new SynOS.Models.Entities.IMS.ImsTubeMaster { TubeId = Guid.NewGuid(), Code = "HEPARIN", Name = "Heparin (Green)", UnitOfMeasure = "each", IsActive = true },
                new SynOS.Models.Entities.IMS.ImsTubeMaster { TubeId = Guid.NewGuid(), Code = "URINE_CUP", Name = "Urine Cup", UnitOfMeasure = "each", IsActive = true },
                new SynOS.Models.Entities.IMS.ImsTubeMaster { TubeId = Guid.NewGuid(), Code = "STERILE", Name = "Sterile Container", UnitOfMeasure = "each", IsActive = true },
                new SynOS.Models.Entities.IMS.ImsTubeMaster { TubeId = Guid.NewGuid(), Code = "STERILE_CONTAINER", Name = "Sterile Container", UnitOfMeasure = "each", IsActive = true }
            };

            foreach (var tube in tubes)
            {
                if (!context.ImsTubeMasters.Any(t => t.Code == tube.Code))
                {
                    context.ImsTubeMasters.Add(tube);
                }
            }
            context.SaveChanges();
        }

        private static void SeedLabProfile(SynOSDbContext context)
        {
            if (context.LabProfiles.Any()) return;

            context.LabProfiles.Add(new LabProfile
            {
                Name = "SRI DIVYA DIAGNOSTIC CENTRE",
                Tagline = "AN ISO 9001:2015 CERTIFIED DIAGNOSTIC CENTRE",
                Address = "H.No. 8-1-162, Near Old Bus Station, Old Municipal office Road, KHAMMAM - 507001",
                Phone = "Cell : 7032996647",
                Email = "sridivyadiagnostics@gmail.com",
                Website = "https://www.sridivya.in",
                Accreditation = "AN ISO 9001:2015 CERTIFIED DIAGNOSTIC CENTRE",
                FooterDisclaimer = "* Clinical correlation of findings. If necessary Discuss / Repeat.",
                HeaderLogoUrl = "/branding/logo_placeholder.png", // Skeleton mode will ignore this but model requires it
                UpdatedAt = DateTimeOffset.UtcNow
            });

            context.SaveChanges();
        }
    }
}