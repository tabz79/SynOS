using System;
using System.Linq;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Enums.IMS;
using SynOS.Models.Entities.HR;

namespace SynOS.Data
{
    public static class DbInitializer
    {
        // TODO: Configure lab timezone in appsettings or a dedicated config service
        private static TimeZoneInfo _labTimeZone = TimeZoneInfo.Local; // Default to server local timezone

        // Define a static DefaultBranchId for seeding purposes
        public static readonly Guid DefaultBranchId = Guid.Parse("A0000000-0000-0000-0000-000000000001"); // Example GUID

        public static void EnsureTablesAndColumnsCreated(SynOSDbContext context)
        {
            var sql = @"
-- 1. Create tables if they don't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BranchOperationalStats' AND type = 'U')
BEGIN
    CREATE TABLE [BranchOperationalStats] (
        [BranchId] uniqueidentifier NOT NULL,
        [Date] datetime2 NOT NULL,
        [PendingReportsCount] int NOT NULL,
        [LastUpdated] datetime2 NOT NULL,
        CONSTRAINT [PK_BranchOperationalStats] PRIMARY KEY ([BranchId], [Date])
    );
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProcessedProjectionEvents' AND type = 'U')
BEGIN
    CREATE TABLE [ProcessedProjectionEvents] (
        [EventId] uniqueidentifier NOT NULL,
        [ProjectionName] nvarchar(100) NOT NULL,
        [ProcessedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ProcessedProjectionEvents] PRIMARY KEY ([EventId], [ProjectionName])
    );
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserOperationalStats' AND type = 'U')
BEGIN
    CREATE TABLE [UserOperationalStats] (
        [UserId] uniqueidentifier NOT NULL,
        [BranchId] uniqueidentifier NOT NULL,
        [Date] datetime2 NOT NULL,
        [WalkInsCount] int NOT NULL,
        [PaymentsTotal] decimal(18,2) NOT NULL,
        [ReportTatTotalMinutes] float NOT NULL,
        [ReportTatCount] int NOT NULL,
        [LastUpdated] datetime2 NOT NULL,
        CONSTRAINT [PK_UserOperationalStats] PRIMARY KEY ([UserId], [BranchId], [Date])
    );
END

-- 2. Add columns to ReferralPartners if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ReferralPartners') AND name = 'PaymentCollectionModel')
BEGIN
    ALTER TABLE [ReferralPartners] ADD [PaymentCollectionModel] nvarchar(50) NOT NULL DEFAULT '';
END

-- 3. Add columns to Patients if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Patients') AND name = 'DisplayName')
BEGIN
    ALTER TABLE [Patients] ADD [DisplayName] nvarchar(256) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Patients') AND name = 'IsDateOfBirthKnown')
BEGIN
    ALTER TABLE [Patients] ADD [IsDateOfBirthKnown] bit NOT NULL DEFAULT 0;
END

-- 4. Add columns to DiscountMasters if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('DiscountMasters') AND name = 'Code')
BEGIN
    ALTER TABLE [DiscountMasters] ADD [Code] nvarchar(50) NOT NULL DEFAULT '';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('DiscountMasters') AND name = 'EffectiveFrom')
BEGIN
    ALTER TABLE [DiscountMasters] ADD [EffectiveFrom] datetime2 NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('DiscountMasters') AND name = 'EffectiveTo')
BEGIN
    ALTER TABLE [DiscountMasters] ADD [EffectiveTo] datetime2 NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('DiscountMasters') AND name = 'Value')
BEGIN
    ALTER TABLE [DiscountMasters] ADD [Value] decimal(18,2) NOT NULL DEFAULT 0.0;
END

-- 5. Add columns to BranchOperationalEvents if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BranchOperationalEvents') AND name = 'SourceId')
BEGIN
    ALTER TABLE [BranchOperationalEvents] ADD [SourceId] uniqueidentifier NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BranchOperationalEvents') AND name = 'SourceType')
BEGIN
    ALTER TABLE [BranchOperationalEvents] ADD [SourceType] nvarchar(max) NULL;
END

-- 6. Add columns to Tests if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'DefaultInterpretation')
BEGIN
    ALTER TABLE [Tests] ADD [DefaultInterpretation] nvarchar(max) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'DefaultInterpretationLastUpdatedAt')
BEGIN
    ALTER TABLE [Tests] ADD [DefaultInterpretationLastUpdatedAt] datetimeoffset NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'DefaultInterpretationLastUpdatedBy')
BEGIN
    ALTER TABLE [Tests] ADD [DefaultInterpretationLastUpdatedBy] uniqueidentifier NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'ReportTitle')
BEGIN
    ALTER TABLE [Tests] ADD [ReportTitle] nvarchar(max) NULL;
END

-- 7. Add columns to ReportTemplates if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ReportTemplates') AND name = 'BranchId')
BEGIN
    ALTER TABLE [ReportTemplates] ADD [BranchId] uniqueidentifier NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ReportTemplates') AND name = 'ModalityId')
BEGIN
    ALTER TABLE [ReportTemplates] ADD [ModalityId] uniqueidentifier NULL;
END

-- 8. Add columns to RadiologyStudies if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RadiologyStudies') AND name = 'ModalityId')
BEGIN
    ALTER TABLE [RadiologyStudies] ADD [ModalityId] uniqueidentifier NULL;
END
";
            context.Database.ExecuteSqlRaw(sql);
        }

        public static void Initialize(SynOSDbContext context)
        {
            // context.Database.EnsureCreated();
            
            SeedBranches(context); // Seed branches first
            SeedRolesAndUsers(context);
            SeedEmployees(context); // Connect Identity to Workforce (Seeding)
            SeedLabProfile(context);
            SeedWorkspaces(context);
            SeedCapabilities(context);

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
            CatalogSeedService.SeedDepartmentMastersAsync(context).GetAwaiter().GetResult();
            CatalogSeedService.SeedModalityMastersAsync(context).GetAwaiter().GetResult();

            SeedIMS(context);
            SeedWorkforcePolicies(context);
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
            var adminUser = context.Users.FirstOrDefault(u => u.Email == "admin@synos.com")
                            ?? context.Users.FirstOrDefault();

            if (adminUser == null)
            {
                Console.WriteLine("[DbInitializer] WARNING: No users found. Skipping report template seeding.");
                return;
            }

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
                "XRayTech", "MriTech", "CTTech", "USTech", "Radiologist", "DeliveryDesk", "Typist", "LabTech",
                "InventoryManager", "Finance"
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
                new { UserId = adminUserId, Username = "admin", Email = "admin@synos.com",    Name = "System Admin",       Password = "admin123", RoleName = "Admin", CanUseOperational = true, CanUseOversight = true },
                new { UserId = Guid.NewGuid(), Username = "reception", Email = "reception@lab.com",  Name = "Reception User",     Password = "Admin",    RoleName = "Receptionist", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Username = "phlebo", Email = "phlebo@lab.com",     Name = "Phlebotomy User",    Password = "Admin",    RoleName = "Phlebotomist", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.Parse("A30F52D6-60E5-4834-9BF1-8C4E56AB3956"), Username = "pathologist", Email = "pathologist@lab.com",Name = "Pathologist User",   Password = "Admin",    RoleName = "Pathologist", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Username = "xray", Email = "xray@lab.com",       Name = "X-Ray Tech User",    Password = "Admin",    RoleName = "XRayTech", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Username = "mri", Email = "mri@lab.com",        Name = "MRI Tech User",      Password = "Admin",    RoleName = "MriTech", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Username = "radiologist", Email = "radiologist@lab.com",Name = "Radiologist User",   Password = "Admin",    RoleName = "Radiologist", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Username = "delivery", Email = "delivery@lab.com",   Name = "Delivery Desk User", Password = "Admin",    RoleName = "DeliveryDesk", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Username = "sarah", Email = "pathologist2@lab.com", Name = "Dr. Sarah Williams", Password = "Admin", RoleName = "Pathologist", CanUseOperational = true, CanUseOversight = false },
                
                // Simulator Specific Users (GPT-5 Mandatory: Role Purity)
                new { UserId = Guid.NewGuid(), Username = "typist1", Email = "typist1@lab.com",    Name = "Simulator Typist",   Password = "Admin",    RoleName = "Typist", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Username = "biotech", Email = "bio.tech@synos.lab", Name = "Simulator Bio Tech", Password = "Admin",    RoleName = "LabTech", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Username = "hemtech", Email = "hemtech@synos.lab",  Name = "Simulator Hem Tech", Password = "Admin",    RoleName = "LabTech", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Username = "inventory", Email = "inventory@lab.com",  Name = "Inventory Manager",  Password = "Admin",    RoleName = "InventoryManager", CanUseOperational = true, CanUseOversight = false },
                new { UserId = Guid.NewGuid(), Username = "finance", Email = "finance@lab.com",    Name = "Finance Controller", Password = "Admin",    RoleName = "Finance", CanUseOperational = true, CanUseOversight = true }
            };

            // Robust Lookup: Find existing users by any available identifier
            var allUsers = context.Users.ToList();
            
            // Fix: If any existing users have empty usernames (common after migration), 
            // we should NOT use them as keys in a dictionary.
            var existingUsersByUsername = allUsers
                .Where(u => !string.IsNullOrEmpty(u.Username))
                .GroupBy(u => u.Username)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

            foreach (var userData in usersToSeed)
            {
                // Priority Lookup:
                // 1. By Fixed UserId (Most reliable)
                // 2. By Username (The new primary identity)
                // 3. By Email (The legacy primary identity)
                var user = allUsers.FirstOrDefault(u => u.UserId == userData.UserId)
                    ?? (existingUsersByUsername.TryGetValue(userData.Username, out var matchByUsername) ? matchByUsername : null)
                    ?? allUsers.FirstOrDefault(u => u.Email.Equals(userData.Email, StringComparison.OrdinalIgnoreCase));

                if (user != null)
                {
                    // Update existing user ONLY if they are not yet fully populated, or for essential fields
                    if (string.IsNullOrEmpty(user.Username))
                    {
                        user.Username = userData.Username;
                    }
                    if (string.IsNullOrEmpty(user.Name))
                    {
                        user.Name = userData.Name;
                    }
                    if (string.IsNullOrEmpty(user.PasswordHash))
                    {
                        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(userData.Password);
                    }
                    
                    user.CanUseOperationalMode = userData.CanUseOperational;
                    user.CanUseOversightMode = userData.CanUseOversight;
                    
                    // Set designation only if it is missing
                    if (string.IsNullOrEmpty(user.Designation))
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
                        Username = userData.Username,
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
                    allUsers.Add(newUser); // Keep our local list in sync for subsequent lookups
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
                var user = allUsers.FirstOrDefault(u => u.Username == userData.Username) 
                    ?? allUsers.First(u => u.Email.Equals(userData.Email, StringComparison.OrdinalIgnoreCase));
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
                new SpecimenType { Code = "SWAB", Name = "Swab", ContainerCategory = "Other", IsActive = true, CreatedAt = DateTimeOffset.UtcNow },
                new SpecimenType { Code = "NO_SPECIMEN", Name = "No Specimen Required", ContainerCategory = "None", IsActive = true, CreatedAt = DateTimeOffset.UtcNow }
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
                OperatingRegion = "Khammam",
                LabCity = "Khammam",
                LabPincode = "507001",
                MiddlewareApiUrl = "http://localhost:5069/api/events",
                MiddlewareApiKey = "TBZ-LAB-KEY-INITIAL-PROD-SECURE-2026-v1",
                LabId = "LAB001",
                BackupEncryptionKey = "TBZ-INITIAL-SECURE-DB-BACKUP-ENCRYPTION-SECRET-KEY",
                DiagnosticsEncryptionKey = "TBZ-INITIAL-SECURE-DIAGNOSTICS-ENCRYPTION-SECRET-KEY",
                PacsMaxInstancesPerSeriesInSeriesTree = 5000,
                PacsMaxTotalInstancesPerStudyInSeriesTree = 20000,
                ReferralEconomicsEnabled = true,
                InventoryValuationMethod = "FIFO",
                ReportStorageFolder = @"C:\SynOS_Files",
                WorkingDirectory = @"C:\SynOS_Working",
                JwtExpiryMinutes = 1440,
                JwtRefreshTokenExpiryDays = 7,
                OtaChannel = "Stable",
                OtaPolicy = "NotifyOnly",
                MaintenanceDay = "Sunday",
                MaintenanceStartHour = "02:00",
                MaintenanceEndHour = "04:00",
                UpdatedAt = DateTimeOffset.UtcNow
            });

            context.SaveChanges();
        }

        private static void SeedCapabilities(SynOSDbContext context)
        {
            if (context.Capabilities.Any()) return;

            var modules = new[] { "Patients", "Tests", "Billing", "Settings", "Reports", "Workspaces" };
            var actions = new[] { "View", "Create", "Edit", "Delete" };

            var seededCapabilities = new List<SynOS.Models.Entities.Governance.Capability>();

            foreach (var module in modules)
            {
                foreach (var action in actions)
                {
                    var name = $"{module}.{action}";
                    var cap = new SynOS.Models.Entities.Governance.Capability
                    {
                        CapabilityId = Guid.NewGuid(),
                        Module = module,
                        Action = action,
                        Name = name
                    };
                    context.Capabilities.Add(cap);
                    seededCapabilities.Add(cap);
                }
            }
            context.SaveChanges();

            // Map all capabilities to Admin role automatically
            var adminRole = context.Roles.FirstOrDefault(r => r.Name == "Admin");
            if (adminRole != null)
            {
                foreach (var cap in seededCapabilities)
                {
                    context.RoleCapabilities.Add(new SynOS.Models.Entities.Governance.RoleCapability
                    {
                        RoleCapabilityId = Guid.NewGuid(),
                        RoleId = adminRole.RoleId,
                        CapabilityId = cap.CapabilityId
                    });
                }
                context.SaveChanges();
            }

            // Map standard capabilities to other roles
            var pathologistRole = context.Roles.FirstOrDefault(r => r.Name == "Pathologist");
            if (pathologistRole != null)
            {
                var pathCaps = seededCapabilities.Where(c => 
                    c.Name == "Reports.View" || c.Name == "Reports.Create" || c.Name == "Reports.Edit" || 
                    c.Name == "Patients.View" || c.Name == "Tests.View");
                foreach (var cap in pathCaps)
                {
                    context.RoleCapabilities.Add(new SynOS.Models.Entities.Governance.RoleCapability
                    {
                        RoleCapabilityId = Guid.NewGuid(),
                        RoleId = pathologistRole.RoleId,
                        CapabilityId = cap.CapabilityId
                    });
                }
                context.SaveChanges();
            }

            var receptionistRole = context.Roles.FirstOrDefault(r => r.Name == "Receptionist" || r.Name == "Reception");
            if (receptionistRole != null)
            {
                var recepCaps = seededCapabilities.Where(c => 
                    c.Name.StartsWith("Patients.") || c.Name.StartsWith("Billing.") || 
                    c.Name == "Tests.View" || c.Name == "Reports.View");
                foreach (var cap in recepCaps)
                {
                    context.RoleCapabilities.Add(new SynOS.Models.Entities.Governance.RoleCapability
                    {
                        RoleCapabilityId = Guid.NewGuid(),
                        RoleId = receptionistRole.RoleId,
                        CapabilityId = cap.CapabilityId
                    });
                }
                context.SaveChanges();
            }
        }

        private static void SeedIMS(SynOSDbContext context)
        {
            if (context.ImsConsumables.Any()) return;

            var starterItems = new List<(string Name, string Code, string Category, string Unit, int Threshold)>
            {
                ("Syringe 5ml", "SYR-5ML", "Consumable", "pcs", 100),
                ("Gloves Nitro Large", "GLV-L", "Consumable", "box", 10),
                ("Cotton Roll", "CTN-R", "Consumable", "pcs", 5),
                ("Alcohol Swabs", "ALC-S", "Consumable", "box", 20),
                ("Blood Collection Tube (Purple)", "TUBE-EDTA", "Consumable", "pcs", 200),
                ("Ball Point Pen (Blue)", "PEN-BL", "Stationery", "pcs", 50),
                ("Printer Paper A4", "PPR-A4", "Stationery", "ream", 10),
                ("Thermal Receipt Roll", "RCT-RL", "Stationery", "pcs", 30),
                ("CT Scan Film 14x17", "CT-FLM", "Imaging", "box", 5),
                ("MRI Contrast Agent", "MRI-CNT", "Imaging", "bottle", 10),
                ("X-Ray Film 8x10", "XR-FLM", "Imaging", "box", 5)
            };

            foreach (var item in starterItems)
            {
                var consumable = new ImsConsumable
                {
                    ConsumableId = Guid.NewGuid(),
                    Code = item.Code,
                    Name = item.Name,
                    Category = item.Category,
                    UnitOfMeasure = item.Unit,
                    LowStockThreshold = item.Threshold,
                    IsActive = true
                };
                context.ImsConsumables.Add(consumable);

                var inventoryItem = new ImsInventoryItem
                {
                    ItemId = Guid.NewGuid(),
                    ItemCode = item.Code,
                    Name = item.Name
                };
                context.ImsInventoryItems.Add(inventoryItem);

                // Seed some initial stock for the default branch
                var lot = new ImsInventoryLot
                {
                    LotId = Guid.NewGuid(),
                    ItemId = inventoryItem.ItemId,
                    BatchNumber = "SEED-2024-001",
                    CurrentQuantity = item.Threshold * 2,
                    ContainerSize = 1,
                    UnitCostSnapshot = 0,
                    BranchId = DefaultBranchId,
                    ExpiryDate = DateTimeOffset.UtcNow.AddYears(1),
                    IsActive = true,
                    ReceivedAt = DateTimeOffset.UtcNow
                };
                context.ImsInventoryLots.Add(lot);
            }

            context.SaveChanges();
            Console.WriteLine("[DbInitializer] SEEDED IMS STARTER PACK");
        }

        private static void SeedEmployees(SynOSDbContext context)
        {
            // Reverse-seed: Ensure every seeded user has an employee record for development
            var users = context.Users.ToList();
            var employees = context.Employees.ToList();

            foreach (var user in users)
            {
                if (!employees.Any(e => e.UserId == user.UserId))
                {
                    var names = user.Name.Split(' ', 2);
                    var firstName = names[0];
                    var lastName = names.Length > 1 ? names[1] : "";

                    var newEmployee = new Employee
                    {
                        EmployeeId = Guid.NewGuid(),
                        UserId = user.UserId,
                        FirstName = firstName,
                        LastName = lastName,
                        JobTitle = user.Designation ?? "Lab Staff",
                        Department = "GENERAL",
                        JoinDate = DateTimeOffset.UtcNow.AddMonths(-6), // Simulation: existed for 6 months
                        IsActive = user.IsActive,
                        BaseSalary = 50000, // Assigned for testing
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    context.Employees.Add(newEmployee);
                    Console.WriteLine($"[DbInitializer] PROVISIONED STAFF RECORD FOR: {user.Email}");
                }
            }
            context.SaveChanges();
        }

        private static void SeedWorkforcePolicies(SynOSDbContext context)
        {
            if (context.WorkforcePolicies == null) return;

            if (!context.WorkforcePolicies.Any(p => p.PolicyName == "LeavePolicy"))
            {
                context.WorkforcePolicies.Add(new SynOS.Models.Entities.Payroll.WorkforcePolicy
                {
                    PolicyId = Guid.NewGuid(),
                    PolicyName = "LeavePolicy",
                    IsEnabled = true,
                    ConfigJson = "{\"defaultMonthlyPaidLeave\":2}",
                    UpdatedAt = DateTime.UtcNow
                });
                context.SaveChanges();
                Console.WriteLine("[DbInitializer] SEEDED GLOBAL LEAVE POLICY");
            }
        }

        private static void SeedWorkspaces(SynOSDbContext context)
        {
            var defaultWorkspaces = new[]
            {
                new { Name = "Reception", RoutePath = "/reception" },
                new { Name = "Phlebotomy", RoutePath = "/phlebotomist" },
                new { Name = "Reports Typing", RoutePath = "/typist" },
                new { Name = "Pathology", RoutePath = "/pathologist" },
                new { Name = "Lab Workbench", RoutePath = "/workbench" },
                new { Name = "Radiology", RoutePath = "/radiology" },
                new { Name = "Inventory", RoutePath = "/inventory" },
                new { Name = "Finance", RoutePath = "/finance" },
                new { Name = "X-Ray Technician", RoutePath = "/xraytech" },
                new { Name = "MRI Technician", RoutePath = "/mritech" },
                new { Name = "CT Technician", RoutePath = "/cttech" },
                new { Name = "Ultrasound Technician", RoutePath = "/ustech" },
                new { Name = "Radiologist Console", RoutePath = "/radiologist" }
            };

            var existingWorkspaces = context.Workspaces.ToDictionary(w => w.RoutePath, w => w, StringComparer.OrdinalIgnoreCase);

            foreach (var ws in defaultWorkspaces)
            {
                if (!existingWorkspaces.ContainsKey(ws.RoutePath))
                {
                    var newWorkspace = new Workspace
                    {
                        WorkspaceId = Guid.NewGuid(),
                        Name = ws.Name,
                        RoutePath = ws.RoutePath,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    context.Workspaces.Add(newWorkspace);
                    existingWorkspaces.Add(ws.RoutePath, newWorkspace);
                    Console.WriteLine($"[DbInitializer] SEEDED WORKSPACE: {ws.Name} ({ws.RoutePath})");
                }
            }
            context.SaveChanges();

            var allUsers = context.Users.ToList();
            var workspacesDb = context.Workspaces.ToList();

            foreach (var user in allUsers)
            {
                var roleName = context.UserBranchRoles
                    .Include(ubr => ubr.Role)
                    .Where(ubr => ubr.UserId == user.UserId)
                    .Select(ubr => ubr.Role.Name)
                    .FirstOrDefault();

                if (string.IsNullOrEmpty(roleName) && user.Username == "admin")
                {
                    roleName = "Admin";
                }

                if (string.IsNullOrEmpty(roleName)) continue;

                List<string> routesToAssign = new List<string>();
                if (roleName == "Admin")
                {
                    routesToAssign.AddRange(workspacesDb.Select(w => w.RoutePath));
                }
                else if (roleName == "Receptionist")
                {
                    routesToAssign.Add("/reception");
                    routesToAssign.Add("/phlebotomist");
                }
                else if (roleName == "Phlebotomist")
                {
                    routesToAssign.Add("/phlebotomist");
                }
                else if (roleName == "Pathologist")
                {
                    routesToAssign.Add("/pathologist");
                    routesToAssign.Add("/typist");
                }
                else if (roleName == "Typist")
                {
                    routesToAssign.Add("/typist");
                }
                else if (roleName == "XRayTech")
                {
                    routesToAssign.Add("/xraytech");
                }
                else if (roleName == "MriTech")
                {
                    routesToAssign.Add("/mritech");
                }
                else if (roleName == "CTTech")
                {
                    routesToAssign.Add("/cttech");
                }
                else if (roleName == "USTech")
                {
                    routesToAssign.Add("/ustech");
                }
                else if (roleName == "Radiologist")
                {
                    routesToAssign.Add("/radiologist");
                }
                else if (roleName == "InventoryManager")
                {
                    routesToAssign.Add("/inventory");
                }
                else if (roleName == "Finance")
                {
                    routesToAssign.Add("/finance");
                }
                else if (roleName == "LabTech" || roleName == "Technician")
                {
                    routesToAssign.Add("/workbench");
                }

                foreach (var route in routesToAssign)
                {
                    var ws = workspacesDb.FirstOrDefault(w => w.RoutePath.Equals(route, StringComparison.OrdinalIgnoreCase));
                    if (ws != null)
                    {
                        var exists = context.UserWorkspaceAccesses.Any(uwa => uwa.UserId == user.UserId && uwa.WorkspaceId == ws.WorkspaceId);
                        if (!exists)
                        {
                            var access = new UserWorkspaceAccess
                            {
                                UserWorkspaceAccessId = Guid.NewGuid(),
                                UserId = user.UserId,
                                WorkspaceId = ws.WorkspaceId,
                                AssignedAt = DateTimeOffset.UtcNow
                            };
                            context.UserWorkspaceAccesses.Add(access);
                            Console.WriteLine($"[DbInitializer] SEEDED USER ACCESS: {user.Username} -> {ws.Name}");
                        }
                    }
                }
            }
            context.SaveChanges();
        }
    }
}
