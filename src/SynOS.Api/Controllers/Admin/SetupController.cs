using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.HR;
using SynOS.Services.Security;
using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using System.Security.Cryptography;
using System.Text;
using System.Net.Http;

namespace SynOS.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/v1/setup")]
    [AllowAnonymous]
    public class SetupController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly Microsoft.Extensions.Hosting.IHostApplicationLifetime _lifetime;
        private readonly ILicenseRecoveryService _licenseRecoveryService;

        public SetupController(
            IConfiguration configuration,
            Microsoft.Extensions.Hosting.IHostApplicationLifetime lifetime,
            ILicenseRecoveryService licenseRecoveryService)
        {
            _configuration = configuration;
            _lifetime = lifetime;
            _licenseRecoveryService = licenseRecoveryService;
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetSetupStatus()
        {
            try
            {
                // Must have a completed setup_state.json record to be considered configured
                var stateConfigured = CheckIsConfiguredViaStateFile();
                if (!stateConfigured)
                {
                    return Ok(new { isConfigured = false });
                }

                // If state file is marked complete, verify database connectivity and operational structure
                var internalConfigured = await CheckIsConfiguredInternal();
                return Ok(new { isConfigured = internalConfigured });
            }
            catch
            {
                return Ok(new { isConfigured = false });
            }
        }

        private string GetSetupStatePath()
        {
            var configDir = @"C:\ProgramData\TBZ Labs\SynOS\Config";
            if (!Directory.Exists(configDir))
            {
                Directory.CreateDirectory(configDir);
            }
            return Path.Combine(configDir, "setup_state.json");
        }

        private bool CheckIsConfiguredViaStateFile()
        {
            try
            {
                var path = GetSetupStatePath();
                if (!System.IO.File.Exists(path))
                {
                    return false;
                }
                var text = System.IO.File.ReadAllText(path);
                var state = JsonSerializer.Deserialize<SetupStateDto>(text);
                return state?.Completed ?? false;
            }
            catch
            {
                return false;
            }
        }

        [HttpGet("progress")]
        public IActionResult GetSetupProgress()
        {
            var path = GetSetupStatePath();
            if (!System.IO.File.Exists(path))
            {
                return Ok(new { currentStep = 1, licenseActivated = false });
            }
            try
            {
                var text = System.IO.File.ReadAllText(path);
                var state = JsonSerializer.Deserialize<SetupStateDto>(text);
                return Ok(state);
            }
            catch
            {
                return Ok(new { currentStep = 1, licenseActivated = false });
            }
        }

        [HttpPost("progress")]
        public IActionResult SaveSetupProgress([FromBody] SetupStateDto dto)
        {
            if (dto == null) return BadRequest();
            try
            {
                var path = GetSetupStatePath();
                var state = new SetupStateDto
                {
                    CurrentStep = dto.CurrentStep,
                    LicenseActivated = dto.LicenseActivated,
                    DatabaseServer = dto.DatabaseServer,
                    DatabaseName = dto.DatabaseName,
                    AdminUsername = dto.AdminUsername,
                    Completed = dto.Completed
                };
                var options = new JsonSerializerOptions { WriteIndented = true };
                System.IO.File.WriteAllText(path, JsonSerializer.Serialize(state, options));
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("initialize")]
        public async Task<IActionResult> InitializeSystem([FromBody] SetupInitializeDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Lock down: reject only if the system is ALREADY actively configured and operational
                if (await CheckIsConfiguredInternal() && CheckIsConfiguredViaStateFile())
                {
                    return BadRequest(new { message = "System is already configured and operational. Use Admin Settings to modify configurations." });
                }

                // Build Connection String
                var connBuilder = new SqlConnectionStringBuilder
                {
                    DataSource = dto.DatabaseServer,
                    InitialCatalog = dto.DatabaseName,
                    TrustServerCertificate = true,
                    MultipleActiveResultSets = true,
                    Encrypt = false
                };

                if (string.IsNullOrEmpty(dto.DatabaseUser))
                {
                    connBuilder.IntegratedSecurity = true;
                }
                else
                {
                    connBuilder.UserID = dto.DatabaseUser;
                    connBuilder.Password = dto.DatabasePassword;
                }

                var connStr = connBuilder.ConnectionString;

                // Explicitly check and create target database using master connection first
                var masterBuilder = new SqlConnectionStringBuilder(connStr)
                {
                    InitialCatalog = "master"
                };
                try
                {
                    Serilog.Log.Information("[Setup] Connecting to master...");
                    using (var masterConn = new SqlConnection(masterBuilder.ConnectionString))
                    {
                        await masterConn.OpenAsync();
                        Serilog.Log.Information("[Setup] Connected successfully.");

                        Serilog.Log.Information($"[Setup] Checking if database '{dto.DatabaseName}' exists...");
                        var checkCmdText = "SELECT COUNT(*) FROM sys.databases WHERE name = @dbName";
                        var dbExists = false;
                        using (var checkCmd = new SqlCommand(checkCmdText, masterConn))
                        {
                            checkCmd.Parameters.AddWithValue("@dbName", dto.DatabaseName);
                            var count = (int)await checkCmd.ExecuteScalarAsync();
                            dbExists = count > 0;
                        }

                        Serilog.Log.Information($"[Setup] Database exists = {dbExists}");

                        if (!dbExists)
                        {
                            Serilog.Log.Information("[Setup] Creating database...");
                            var builder = new SqlCommandBuilder();
                            var escapedDbName = builder.QuoteIdentifier(dto.DatabaseName);
                            var createCmdText = $"CREATE DATABASE {escapedDbName}";
                            using (var createCmd = new SqlCommand(createCmdText, masterConn))
                            {
                                await createCmd.ExecuteNonQueryAsync();
                            }
                            Serilog.Log.Information("[Setup] Database created successfully.");
                        }

                        // Ensure NT AUTHORITY\SYSTEM has a login on SQL Server
                        if (connStr.Contains("Integrated Security=true", StringComparison.OrdinalIgnoreCase) || 
                            connStr.Contains("Integrated Security=SSPI", StringComparison.OrdinalIgnoreCase) ||
                            connStr.Contains("Trusted_Connection=true", StringComparison.OrdinalIgnoreCase))
                        {
                            try
                            {
                                Serilog.Log.Information("[Setup] Creating SQL Server login for NT AUTHORITY\\SYSTEM...");
                                var loginQuery = @"
                                    IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'NT AUTHORITY\SYSTEM')
                                    BEGIN
                                        CREATE LOGIN [NT AUTHORITY\SYSTEM] FROM WINDOWS;
                                    END;";
                                using (var loginCmd = new SqlCommand(loginQuery, masterConn))
                                {
                                    await loginCmd.ExecuteNonQueryAsync();
                                }
                                Serilog.Log.Information("[Setup] SQL Server login created successfully.");
                            }
                            catch (Exception ex)
                            {
                                Serilog.Log.Warning($"[Setup] Non-fatal: Failed to create login for NT AUTHORITY\\SYSTEM: {ex.Message}");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Serilog.Log.Warning($"[Setup] Notice on master connection or database check: {ex.Message}. Proceeding to target database connection check.");
                }

                // Validate Connection & Run Migrations targeting the new database
                var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
                optionsBuilder.UseSqlServer(connStr, sqlOpts =>
                {
                    sqlOpts.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(15), errorNumbersToAdd: null);
                    sqlOpts.CommandTimeout(120);
                });
                using var context = new SynOSDbContext(optionsBuilder.Options);

                try
                {
                    Serilog.Log.Information("[Setup] Running EF migrations...");
                    try
                    {
                        await context.Database.MigrateAsync();
                        Serilog.Log.Information("[Setup] Migrations completed.");
                    }
                    catch (Exception migEx)
                    {
                        Serilog.Log.Warning(migEx, "[Setup] EF MigrateAsync encountered an issue, proceeding with EnsureCreated / manual adjustments fallback: {Message}", migEx.Message);
                    }

                    Serilog.Log.Information("[Setup] Applying manual schema adjustments (v7, v8, v9)...");
                    var manualQueries = new[]
                    {
                        // v7: DefaultInterpretation
                        @"IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'DefaultInterpretation' AND Object_ID = OBJECT_ID(N'Catalog_Tests'))
                          BEGIN
                              ALTER TABLE [Catalog_Tests] ADD [DefaultInterpretation] nvarchar(max) NULL;
                              ALTER TABLE [Catalog_Tests] ADD [DefaultInterpretationLastUpdatedAt] datetimeoffset NULL;
                              ALTER TABLE [Catalog_Tests] ADD [DefaultInterpretationLastUpdatedBy] uniqueidentifier NULL;
                          END",
                        @"IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'DefaultInterpretation' AND Object_ID = OBJECT_ID(N'Tests'))
                          BEGIN
                              ALTER TABLE [Tests] ADD [DefaultInterpretation] nvarchar(max) NULL;
                              ALTER TABLE [Tests] ADD [DefaultInterpretationLastUpdatedAt] datetimeoffset NULL;
                              ALTER TABLE [Tests] ADD [DefaultInterpretationLastUpdatedBy] uniqueidentifier NULL;
                          END",
                        // v8: ReportTitle
                        @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'ReportTitle')
                          BEGIN
                              ALTER TABLE Tests ADD ReportTitle NVARCHAR(200) NULL;
                          END",
                        @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Catalog_Tests') AND name = 'ReportTitle')
                          BEGIN
                              ALTER TABLE Catalog_Tests ADD ReportTitle NVARCHAR(200) NULL;
                          END",
                        // v9: ParameterNarrative
                        @"IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'NarrativeTemplate' AND Object_ID = OBJECT_ID(N'Catalog_Parameters'))
                          BEGIN
                              ALTER TABLE [Catalog_Parameters] ADD [NarrativeTemplate] nvarchar(max) NULL;
                          END",
                        @"IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'ShowNarrative' AND Object_ID = OBJECT_ID(N'Catalog_Parameters'))
                          BEGIN
                              ALTER TABLE [Catalog_Parameters] ADD [ShowNarrative] bit NOT NULL DEFAULT 0;
                          END",
                        @"IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'NarrativeTemplate' AND Object_ID = OBJECT_ID(N'Parameters'))
                          BEGIN
                              ALTER TABLE [Parameters] ADD [NarrativeTemplate] nvarchar(max) NULL;
                          END",
                        @"IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'ShowNarrative' AND Object_ID = OBJECT_ID(N'Parameters'))
                          BEGIN
                              ALTER TABLE [Parameters] ADD [ShowNarrative] bit NOT NULL DEFAULT 0;
                          END",
                        // v10: IMS_InventoryItems ServiceArea and Modality
                        @"IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'ServiceArea' AND Object_ID = OBJECT_ID(N'IMS_InventoryItems'))
                          BEGIN
                              ALTER TABLE [IMS_InventoryItems] ADD [ServiceArea] nvarchar(100) NOT NULL DEFAULT 'Laboratory';
                          END",
                        @"IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'Modality' AND Object_ID = OBJECT_ID(N'IMS_InventoryItems'))
                          BEGIN
                              ALTER TABLE [IMS_InventoryItems] ADD [Modality] nvarchar(100) NULL;
                          END",
                        // v11: IMS_TestConsumableMaps QuantityPerTest DECIMAL(18,4)
                        @"IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IMS_TestConsumableMaps') AND name = 'QuantityPerTest' AND system_type_id = 56)
                          BEGIN
                              ALTER TABLE [IMS_TestConsumableMaps] ALTER COLUMN [QuantityPerTest] decimal(18,4) NOT NULL;
                          END",
                        // v12: IMS_TestConsumableMaps DisplayQuantity and DisplayUnit
                        @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IMS_TestConsumableMaps') AND name = 'DisplayQuantity')
                          BEGIN
                              ALTER TABLE [IMS_TestConsumableMaps] ADD [DisplayQuantity] decimal(18,4) NULL;
                              ALTER TABLE [IMS_TestConsumableMaps] ADD [DisplayUnit] nvarchar(50) NULL;
                          END",
                        // v13: IMS_StockRequests RequestedFromScreen
                        @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IMS_StockRequests') AND name = 'RequestedFromScreen')
                          BEGIN
                              ALTER TABLE [IMS_StockRequests] ADD [RequestedFromScreen] nvarchar(100) NULL;
                          END",
                        // v14: IMS_StockRequests RequesterRole
                        @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IMS_StockRequests') AND name = 'RequesterRole')
                          BEGIN
                              ALTER TABLE [IMS_StockRequests] ADD [RequesterRole] nvarchar(100) NULL;
                          END",
                        // v15: LabProfiles LicenseKey
                        @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LabProfiles') AND name = 'LicenseKey')
                          BEGIN
                              ALTER TABLE [LabProfiles] ADD [LicenseKey] nvarchar(max) NULL;
                          END",
                        // v16: RadiologyModalities HostIpAddress
                        @"IF EXISTS (SELECT * FROM sys.tables WHERE name = 'RadiologyModalities' AND type = 'U')
                          BEGIN
                              IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RadiologyModalities') AND name = 'HostIpAddress')
                                  ALTER TABLE [RadiologyModalities] ADD [HostIpAddress] nvarchar(50) NULL;
                          END",
                        // v17: AnalyzerListeners HostIpAddress & columns
                        @"IF EXISTS (SELECT * FROM sys.tables WHERE name = 'AnalyzerListeners' AND type = 'U')
                          BEGIN
                              IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'HostIpAddress')
                                  ALTER TABLE [AnalyzerListeners] ADD [HostIpAddress] nvarchar(50) NULL;
                              IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'ConnectionMode')
                                  ALTER TABLE [AnalyzerListeners] ADD [ConnectionMode] nvarchar(20) NOT NULL DEFAULT 'TcpServer';
                              IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'SerialPortName')
                                  ALTER TABLE [AnalyzerListeners] ADD [SerialPortName] nvarchar(20) NULL;
                              IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'BaudRate')
                                  ALTER TABLE [AnalyzerListeners] ADD [BaudRate] int NOT NULL DEFAULT 9600;
                              IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'DataBits')
                                  ALTER TABLE [AnalyzerListeners] ADD [DataBits] int NOT NULL DEFAULT 8;
                              IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'Parity')
                                  ALTER TABLE [AnalyzerListeners] ADD [Parity] nvarchar(max) NOT NULL DEFAULT 'None';
                              IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'StopBits')
                                  ALTER TABLE [AnalyzerListeners] ADD [StopBits] nvarchar(max) NOT NULL DEFAULT 'One';
                              IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'Handshake')
                                  ALTER TABLE [AnalyzerListeners] ADD [Handshake] nvarchar(max) NOT NULL DEFAULT 'None';
                              IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'WatchFolderPath')
                                  ALTER TABLE [AnalyzerListeners] ADD [WatchFolderPath] nvarchar(260) NULL;
                              IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'WorklistMode')
                                  ALTER TABLE [AnalyzerListeners] ADD [WorklistMode] nvarchar(30) NOT NULL DEFAULT 'Unidirectional';
                              IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AnalyzerListeners') AND name = 'IsActive')
                                  ALTER TABLE [AnalyzerListeners] ADD [IsActive] bit NOT NULL DEFAULT 1;
                          END",
                        // v18: Patients MRN expansion
                        @"IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Patients') AND name = 'MRN' AND max_length < 100)
                          BEGIN
                              ALTER TABLE [Patients] ALTER COLUMN [MRN] nvarchar(50) NOT NULL;
                          END",
                        // v19: Visits Token column expansion to 64 chars
                        @"IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Visits') AND name = 'Token' AND max_length < 128)
                          BEGIN
                              ALTER TABLE [Visits] ALTER COLUMN [Token] nvarchar(64) NOT NULL;
                          END"
                    };

                    foreach (var query in manualQueries)
                    {
                        try
                        {
                            await context.Database.ExecuteSqlRawAsync(query);
                        }
                        catch (Exception qEx)
                        {
                            Serilog.Log.Warning("[Setup] Non-fatal notice executing manual schema query: {Message}", qEx.Message);
                        }
                    }
                    Serilog.Log.Information("[Setup] Manual schema adjustments applied successfully.");
                }
                catch (Exception ex)
                {
                    Serilog.Log.Warning(ex, "[Setup] Schema adjustment pipeline encountered notice: {Message}. Continuing bootstrap.", ex.Message);
                }

                // Seed Base Tables
                try
                {
                    DbInitializer.Initialize(context);
                }
                catch (Exception seedEx)
                {
                    Serilog.Log.Warning(seedEx, "[Setup] DbInitializer encountered non-fatal seed notice: {Message}", seedEx.Message);
                }

                // Ensure NT AUTHORITY\SYSTEM is db_owner on the database context
                if (connStr.Contains("Integrated Security=true", StringComparison.OrdinalIgnoreCase) || 
                    connStr.Contains("Integrated Security=SSPI", StringComparison.OrdinalIgnoreCase) ||
                    connStr.Contains("Trusted_Connection=true", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        Serilog.Log.Information("[Setup] Granting db_owner permissions to NT AUTHORITY\\SYSTEM...");
                        var dbUserQuery = @"
                            IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'NT AUTHORITY\SYSTEM')
                            BEGIN
                                CREATE USER [NT AUTHORITY\SYSTEM] FOR LOGIN [NT AUTHORITY\SYSTEM];
                            END;
                            ALTER ROLE [db_owner] ADD MEMBER [NT AUTHORITY\SYSTEM];";
                        await context.Database.ExecuteSqlRawAsync(dbUserQuery);
                        Serilog.Log.Information("[Setup] Permissions granted successfully.");
                    }
                    catch (Exception ex)
                    {
                        Serilog.Log.Warning($"[Setup] Non-fatal: Failed to grant database permissions to NT AUTHORITY\\SYSTEM: {ex.Message}");
                    }
                }

                // Create or Update LabProfile with directories & parameters
                var profile = await context.LabProfiles.FirstOrDefaultAsync();
                if (profile == null)
                {
                    profile = new LabProfile
                    {
                        LabProfileId = Guid.NewGuid(),
                        Name = "SynOS Synthesized Laboratory",
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    context.LabProfiles.Add(profile);
                }

                profile.ReportStorageFolder = !string.IsNullOrWhiteSpace(dto.DocumentStorageFolder) ? dto.DocumentStorageFolder : "C:\\SynOS_Files";
                profile.WorkingDirectory = !string.IsNullOrWhiteSpace(dto.WorkingDirectory) ? dto.WorkingDirectory : "C:\\SynOS_Working";
                profile.MiddlewareApiUrl = !string.IsNullOrWhiteSpace(dto.MiddlewareApiUrl) ? dto.MiddlewareApiUrl : (_configuration["Middleware:ApiUrl"] ?? "https://cloud.tbzlabs.in/api/events");
                profile.LicenseKey = LicenseKeyProtector.Protect(!string.IsNullOrWhiteSpace(dto.MiddlewareApiKey) ? dto.MiddlewareApiKey : _configuration["Middleware:ApiKey"]);
                profile.MiddlewareApiKey = null;
                profile.LabId = !string.IsNullOrWhiteSpace(dto.LabId) ? dto.LabId : (_configuration["Middleware:LabId"] ?? "LAB002");
                profile.LicenseType = dto.LicenseType;
                profile.MaximumBranches = dto.MaximumBranches ?? 1;
                profile.LicenseStatus = dto.LicenseStatus;
                profile.EnabledFeatures = dto.EnabledFeatures ?? new System.Collections.Generic.List<string>();
                if (!string.IsNullOrEmpty(dto.LicenseExpiryDate) && DateTime.TryParse(dto.LicenseExpiryDate, out var parsedExp))
                {
                    profile.LicenseExpiryDate = parsedExp;
                }
                profile.PacsMaxInstancesPerSeriesInSeriesTree = 5000;
                profile.PacsMaxTotalInstancesPerStudyInSeriesTree = 20000;
                profile.ReferralEconomicsEnabled = true;
                profile.InventoryValuationMethod = "FIFO";

                // Generate secure JWT secret, Backup Encryption Key, and Diagnostics Encryption key automatically
                profile.DiagnosticsEncryptionKey = GenerateSecureKey(32);

                // Initialize JWT Lifetime settings
                profile.JwtExpiryMinutes = 1440;
                profile.JwtRefreshTokenExpiryDays = 7;

                // Initialize OTA Settings
                profile.OtaChannel = "Stable";
                profile.OtaPolicy = "NotifyOnly";
                profile.MaintenanceDay = "Sunday";
                profile.MaintenanceStartHour = "02:00";
                profile.MaintenanceEndHour = "04:00";

                profile.UpdatedAt = DateTimeOffset.UtcNow;

                // Ensure storage directories exist
                EnsureDirectoriesExist(dto.DocumentStorageFolder ?? "C:\\SynOS_Files", dto.WorkingDirectory ?? "C:\\SynOS_Working");

                // Create or Elevate Admin User
                var hasExistingUsers = await context.Users.AnyAsync();
                if (!string.IsNullOrWhiteSpace(dto.AdminUsername) && !string.IsNullOrWhiteSpace(dto.AdminPassword))
                {
                    var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.Name.ToLower() == "admin");
                    if (adminRole == null)
                    {
                        return StatusCode(500, new { message = "Seeded Admin role not found. Please contact support." });
                    }

                    var defaultBranch = await context.Branches.FirstOrDefaultAsync(b => b.Code == "MAIN" || b.BranchId == SynOS.Data.DbInitializer.DefaultBranchId)
                                        ?? await context.Branches.FirstOrDefaultAsync();
                    if (defaultBranch == null)
                    {
                        defaultBranch = new Branch
                        {
                            BranchId = SynOS.Data.DbInitializer.DefaultBranchId,
                            Code = "MAIN",
                            Name = "Main Laboratory",
                            IsActive = true
                        };
                        context.Branches.Add(defaultBranch);
                        await context.SaveChangesAsync();
                    }

                    User targetAdmin = null;
                    var adminUsernameClean = !string.IsNullOrWhiteSpace(dto.AdminUsername) ? dto.AdminUsername.Trim() : (dto.AdminEmail?.Contains("@") == true ? dto.AdminEmail.Split('@')[0].Trim() : "admin");
                    if (adminUsernameClean.Contains("@"))
                    {
                        adminUsernameClean = adminUsernameClean.Split('@')[0].Trim();
                    }

                    var emailVal = !string.IsNullOrWhiteSpace(dto.AdminEmail) 
                        ? dto.AdminEmail.Trim() 
                        : (dto.AdminUsername?.Contains("@") == true ? dto.AdminUsername.Trim() : $"{adminUsernameClean}@synos.local");
                    var nameVal = !string.IsNullOrWhiteSpace(dto.AdminName) 
                        ? dto.AdminName.Trim() 
                        : "Administrator";

                    // Match existing user by username OR email
                    var existingUser = await context.Users.FirstOrDefaultAsync(u => 
                        u.Username.ToLower() == adminUsernameClean.ToLower() || 
                        (!string.IsNullOrEmpty(dto.AdminUsername) && u.Username.ToLower() == dto.AdminUsername.ToLower()) ||
                        (!string.IsNullOrEmpty(u.Email) && (u.Email.ToLower() == emailVal.ToLower() || u.Email.ToLower() == adminUsernameClean.ToLower())));

                    if (existingUser == null)
                    {
                        var userId = Guid.NewGuid();
                        targetAdmin = new User
                        {
                            UserId = userId,
                            Username = adminUsernameClean,
                            Email = emailVal,
                            Name = nameVal,
                            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.AdminPassword),
                            IsActive = true,
                            Designation = "Administrator",
                            IsDefaultSignatory = true,
                            CanUseOperationalMode = true,
                            CanUseOversightMode = true
                        };
                        context.Users.Add(targetAdmin);

                        // Add role assignment in UserBranchRoles
                        context.UserBranchRoles.Add(new UserBranchRole
                        {
                            UserBranchRoleId = Guid.NewGuid(),
                            UserId = userId,
                            BranchId = defaultBranch.BranchId,
                            RoleId = adminRole.RoleId
                        });

                        // Add role assignment in UserRoles
                        context.UserRoles.Add(new UserRole
                        {
                            UserId = userId,
                            RoleId = adminRole.RoleId
                        });

                        // Add Employee record with all required fields to align dual provisioning
                        context.Employees.Add(new Employee
                        {
                            EmployeeId = Guid.NewGuid(),
                            UserId = userId,
                            FirstName = nameVal,
                            LastName = "Admin",
                            Email = targetAdmin.Email,
                            IsActive = true,
                            JobTitle = "Administrator",
                            Department = "GENERAL",
                            JoinDate = DateTimeOffset.UtcNow,
                            BaseSalary = 50000,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                    else
                    {
                        targetAdmin = existingUser;
                        existingUser.Username = adminUsernameClean;
                        if (!string.IsNullOrWhiteSpace(nameVal) && (existingUser.Name == "Administrator" || string.IsNullOrWhiteSpace(existingUser.Name))) existingUser.Name = nameVal;
                        if (!string.IsNullOrWhiteSpace(emailVal) && string.IsNullOrEmpty(existingUser.Email)) existingUser.Email = emailVal;
                        existingUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.AdminPassword);
                        existingUser.IsActive = true;
                        existingUser.CanUseOperationalMode = true;
                        existingUser.CanUseOversightMode = true;

                        // Ensure UserRoles has Admin role
                        var hasAdminRole = await context.UserRoles.AnyAsync(ur => ur.UserId == existingUser.UserId && ur.RoleId == adminRole.RoleId);
                        if (!hasAdminRole)
                        {
                            context.UserRoles.Add(new UserRole
                            {
                                UserId = existingUser.UserId,
                                RoleId = adminRole.RoleId
                            });
                        }

                        // Ensure UserBranchRoles has Admin role for default branch
                        var branchRole = await context.UserBranchRoles.FirstOrDefaultAsync(ubr => ubr.UserId == existingUser.UserId && ubr.BranchId == defaultBranch.BranchId);
                        if (branchRole != null)
                        {
                            branchRole.RoleId = adminRole.RoleId;
                        }
                        else
                        {
                            context.UserBranchRoles.Add(new UserBranchRole
                            {
                                UserBranchRoleId = Guid.NewGuid(),
                                UserId = existingUser.UserId,
                                BranchId = defaultBranch.BranchId,
                                RoleId = adminRole.RoleId
                            });
                        }

                        // Ensure Employee profile exists for the existing administrator
                        var existingEmp = await context.Employees.FirstOrDefaultAsync(e => e.UserId == existingUser.UserId);
                        if (existingEmp == null)
                        {
                            context.Employees.Add(new Employee
                            {
                                EmployeeId = Guid.NewGuid(),
                                UserId = existingUser.UserId,
                                FirstName = existingUser.Name ?? "Admin",
                                LastName = "User",
                                Email = existingUser.Email,
                                IsActive = true,
                                JobTitle = "Administrator",
                                Department = "GENERAL",
                                JoinDate = DateTimeOffset.UtcNow,
                                BaseSalary = 50000,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            });
                        }
                        else
                        {
                            existingEmp.IsActive = true;
                        }
                    }

                    // Grant access to all workspaces for targetAdmin
                    var existingWorkspaces = await context.UserWorkspaceAccesses
                        .Where(uwa => uwa.UserId == targetAdmin.UserId)
                        .Select(uwa => uwa.WorkspaceId)
                        .ToListAsync();
                    var allWorkspaces = await context.Workspaces.ToListAsync();
                    foreach (var ws in allWorkspaces)
                    {
                        if (!existingWorkspaces.Contains(ws.WorkspaceId))
                        {
                            context.UserWorkspaceAccesses.Add(new UserWorkspaceAccess
                            {
                                UserWorkspaceAccessId = Guid.NewGuid(),
                                UserId = targetAdmin.UserId,
                                WorkspaceId = ws.WorkspaceId
                            });
                        }
                    }
                }
                else if (!hasExistingUsers)
                {
                    return BadRequest(new { message = "Administrator credentials are required for a fresh installation." });
                }

                try
                {
                    await context.SaveChangesAsync();
                }
                catch (DbUpdateException dbUpdateEx)
                {
                    var innerMessage = dbUpdateEx.InnerException?.Message ?? dbUpdateEx.Message;
                    Serilog.Log.Error($"[Setup] DbUpdateException during save: {innerMessage}");
                    return StatusCode(500, new { message = $"Database save failed: {innerMessage}" });
                }

                // Save connection string and generated JWT signing secret to client appsettings.json
                var clientPath = FindAppSettingsPath();
                if (System.IO.File.Exists(clientPath))
                {
                    var jsonText = await System.IO.File.ReadAllTextAsync(clientPath);
                    var root = JsonNode.Parse(jsonText)?.AsObject();
                    if (root != null)
                    {
                        SetNodeValue(root, "ConnectionStrings:DefaultConnection", JsonValue.Create(connStr));
                        SetNodeValue(root, "Jwt:Secret", JsonValue.Create(GenerateSecureKey(64)));
                        SetNodeValue(root, "Jwt:Issuer", JsonValue.Create("SynOS.Api"));
                        SetNodeValue(root, "Jwt:Audience", JsonValue.Create("SynOS.Client"));
                        SetNodeValue(root, "Pacs:RootPath", JsonValue.Create(dto.PacsStorageFolder ?? "C:\\SynOS_Files\\PACS"));
                        SetNodeValue(root, "FileStorage:BasePath", JsonValue.Create(dto.DocumentStorageFolder ?? "C:\\SynOS_Files"));
                        SetNodeValue(root, "FileStorage:PublicBaseUrl", JsonValue.Create("http://localhost:59999/files"));
                        SetNodeValue(root, "SecureLink:BaseUrl", JsonValue.Create("http://localhost:59999/secure"));
                        SetNodeValue(root, "SecureLink:PublicBaseUrl", JsonValue.Create("http://localhost:59999/secure"));
                        SetNodeValue(root, "Middleware:LabId", JsonValue.Create(dto.LabId ?? "LAB001"));
                        SetNodeValue(root, "Middleware:ApiUrl", JsonValue.Create(dto.MiddlewareApiUrl ?? "https://cloud.tbzlabs.in/api/events"));
                        SetNodeValue(root, "Middleware:ApiKey", JsonValue.Create(dto.MiddlewareApiKey ?? string.Empty));

                        var writeOptions = new JsonSerializerOptions { WriteIndented = true };
                        await System.IO.File.WriteAllTextAsync(clientPath, JsonSerializer.Serialize(root, writeOptions));
                    }
                }

                SynOS.Api.Services.SystemSetupState.IsConfigured = true;

                if (_configuration is IConfigurationRoot configRoot)
                {
                    configRoot.Reload();
                }

                // 1. Mark setup as completed in setup_state.json
                try
                {
                    var statePath = GetSetupStatePath();
                    var state = new SetupStateDto
                    {
                        CurrentStep = 3,
                        LicenseActivated = true,
                        DatabaseServer = dto.DatabaseServer,
                        DatabaseName = dto.DatabaseName,
                        AdminUsername = dto.AdminUsername,
                        Completed = true
                    };
                    var options = new JsonSerializerOptions { WriteIndented = true };
                    System.IO.File.WriteAllText(statePath, JsonSerializer.Serialize(state, options));
                }
                catch {}

                var host = Request.Host.Host ?? "localhost";
                var servicePort = SynOS.Api.Services.SystemSetupState.ServicePort;
                var serviceStatusUrl = $"http://{host}:{servicePort}/api/v1/setup/status";
                var loginUrl = $"http://{host}:{servicePort}/login";

                // 2. Determine runtime mode: Windows Service vs. Standalone interactive console
                var isWindowsService = Microsoft.Extensions.Hosting.WindowsServices.WindowsServiceHelpers.IsWindowsService() || !Environment.UserInteractive;

                if (isWindowsService)
                {
                    Serilog.Log.Information("[Setup] SynOS is running as a Windows Service (TBZSynOSService) on port {Port}. System is configured and operational; continuing in-process without restarting.", servicePort);
                    return Ok(new { success = true, isConfigured = true, serviceStatusUrl = serviceStatusUrl, loginUrl = loginUrl });
                }

                // If running interactively as a standalone console (e.g. SynOS.Api.exe --setup in development),
                // release port 59999 and hand over to TBZSynOSService in background
                _ = Task.Run(async () =>
                {
                    try
                    {
                        // Allow 500ms for HTTP 200 response to cleanly flush across network
                        await Task.Delay(500);

                        Serilog.Log.Information("[Setup] Stopping standalone setup server lifetime to release port 59999...");
                        _lifetime.StopApplication();
                        await Task.Delay(500);

                        Serilog.Log.Information("[Setup] Starting Windows Service (TBZSynOSService)...");
                        using var sc = new System.ServiceProcess.ServiceController("TBZSynOSService");
                        if (sc.Status != System.ServiceProcess.ServiceControllerStatus.Running && sc.Status != System.ServiceProcess.ServiceControllerStatus.StartPending)
                        {
                            try
                            {
                                sc.Start();
                                Serilog.Log.Information("[Setup] Windows Service start command issued successfully.");
                            }
                            catch (Exception serviceEx)
                            {
                                Serilog.Log.Warning($"[Setup] Standard service start failed ({serviceEx.Message}). Attempting elevated startup...");
                                var psi = new System.Diagnostics.ProcessStartInfo
                                {
                                    FileName = "cmd.exe",
                                    Arguments = "/c net start TBZSynOSService",
                                    Verb = "runas",
                                    UseShellExecute = true,
                                    WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden
                                };
                                using var p = System.Diagnostics.Process.Start(psi);
                                if (p != null)
                                {
                                    await p.WaitForExitAsync();
                                }
                                Serilog.Log.Information("[Setup] Elevated service start command completed.");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Serilog.Log.Error($"[Setup] Failed to transition to Windows Service: {ex.Message}");
                    }
                    finally
                    {
                        Serilog.Log.Information("[Setup] Terminating standalone setup server process to finalize handover.");
                        Environment.Exit(0);
                    }
                });

                return Ok(new { success = true, isConfigured = true, serviceStatusUrl = serviceStatusUrl, loginUrl = loginUrl });
            }
            catch (Exception ex)
            {
                Serilog.Log.Error(ex, "[Setup] InitializeSystem failed with unhandled error: {Message}", ex.Message);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("test-db")]
        public async Task<IActionResult> TestDbConnection([FromBody] DbConnectionDto dto)
        {
            try
            {
                var connBuilder = new SqlConnectionStringBuilder
                {
                    DataSource = dto.Server,
                    InitialCatalog = "master",
                    TrustServerCertificate = true,
                    MultipleActiveResultSets = true,
                    Encrypt = true
                };

                if (string.IsNullOrEmpty(dto.User))
                {
                    connBuilder.IntegratedSecurity = true;
                }
                else
                {
                    connBuilder.UserID = dto.User;
                    connBuilder.Password = dto.Password;
                }

                using var conn = new SqlConnection(connBuilder.ConnectionString);
                await conn.OpenAsync();
                return Ok(new { success = true, message = "Database connection test successful." });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("discover-databases")]
        public async Task<IActionResult> DiscoverDatabases([FromBody] DiscoverDatabasesDto dto)
        {
            try
            {
                var server = string.IsNullOrWhiteSpace(dto?.Server) ? @".\SYNOS" : dto.Server;
                var connBuilder = new SqlConnectionStringBuilder
                {
                    DataSource = server,
                    InitialCatalog = "master",
                    TrustServerCertificate = true,
                    MultipleActiveResultSets = true,
                    Encrypt = true
                };

                if (string.IsNullOrEmpty(dto?.User))
                {
                    connBuilder.IntegratedSecurity = true;
                }
                else
                {
                    connBuilder.UserID = dto.User;
                    connBuilder.Password = dto.Password;
                }

                using var conn = new SqlConnection(connBuilder.ConnectionString);
                await conn.OpenAsync();

                var query = @"
                    SELECT name 
                    FROM sys.databases 
                    WHERE state = 0 AND name NOT IN ('master', 'tempdb', 'model', 'msdb')
                    ORDER BY create_date DESC";

                var dbNames = new List<string>();
                using (var cmd = new SqlCommand(query, conn))
                using (var reader = await cmd.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        dbNames.Add(reader.GetString(0));
                    }
                }

                var results = new List<DiscoveredDatabaseDto>();
                foreach (var dbName in dbNames)
                {
                    try
                    {
                        var targetBuilder = new SqlConnectionStringBuilder(connBuilder.ConnectionString)
                        {
                            InitialCatalog = dbName
                        };
                        using var targetConn = new SqlConnection(targetBuilder.ConnectionString);
                        await targetConn.OpenAsync();

                        var checkQuery = @"
                            SELECT 
                                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Users') AS HasUsers,
                                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='LabProfiles') AS HasProfiles";

                        bool hasUsersTable = false;
                        bool hasProfilesTable = false;
                        using (var checkCmd = new SqlCommand(checkQuery, targetConn))
                        using (var reader = await checkCmd.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                hasUsersTable = !reader.IsDBNull(0) && reader.GetInt32(0) > 0;
                                hasProfilesTable = !reader.IsDBNull(1) && reader.GetInt32(1) > 0;
                            }
                        }

                        if (hasUsersTable)
                        {
                            int userCount = 0;
                            var usernames = new List<string>();
                            try
                            {
                                using (var userCmd = new SqlCommand("SELECT COUNT(*) FROM Users", targetConn))
                                {
                                    var val = await userCmd.ExecuteScalarAsync();
                                    if (val != null && val != DBNull.Value) userCount = Convert.ToInt32(val);
                                }
                            }
                            catch { }

                            try
                            {
                                using (var adminCmd = new SqlCommand("SELECT TOP 5 Username FROM Users", targetConn))
                                using (var reader = await adminCmd.ExecuteReaderAsync())
                                {
                                    while (await reader.ReadAsync())
                                    {
                                        if (!reader.IsDBNull(0)) usernames.Add(reader.GetString(0));
                                    }
                                }
                            }
                            catch { }

                            string? labName = null;
                            if (hasProfilesTable)
                            {
                                try
                                {
                                    using var labCmd = new SqlCommand("SELECT TOP 1 Name FROM LabProfiles", targetConn);
                                    var labVal = await labCmd.ExecuteScalarAsync();
                                    if (labVal != null && labVal != DBNull.Value) labName = labVal.ToString();
                                }
                                catch { }
                            }

                            results.Add(new DiscoveredDatabaseDto
                            {
                                Name = dbName,
                                HasUsers = userCount > 0,
                                UserCount = userCount,
                                LabName = labName,
                                AdminUsernames = usernames
                            });
                        }
                        else if (dbName.Contains("SynOS", StringComparison.OrdinalIgnoreCase))
                        {
                            results.Add(new DiscoveredDatabaseDto
                            {
                                Name = dbName,
                                HasUsers = false,
                                UserCount = 0
                            });
                        }
                    }
                    catch { }
                }

                return Ok(new { success = true, databases = results });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message, databases = new List<DiscoveredDatabaseDto>() });
            }
        }

        [HttpPost("test-path")]
        public async Task<IActionResult> TestPathPermissions([FromBody] PathDto dto)
        {
            try
            {
                if (string.IsNullOrEmpty(dto.Path))
                    return BadRequest("Path is empty.");

                if (!Directory.Exists(dto.Path))
                    Directory.CreateDirectory(dto.Path);

                var tempFile = Path.Combine(dto.Path, $"write_test_{Guid.NewGuid():N}.tmp");
                await System.IO.File.WriteAllTextAsync(tempFile, "temp");
                System.IO.File.Delete(tempFile);

                return Ok(new { success = true, message = "Path verification and write permission tests successful." });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("test-middleware")]
        public async Task<IActionResult> TestMiddlewareConnection([FromBody] MiddlewareDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.ApiKey))
                {
                    return Ok(new { success = false, message = "Activation Key is required." });
                }

                var rawKey = dto.ApiKey.Trim();
                var apiUrl = !string.IsNullOrWhiteSpace(dto.ApiUrl)
                    ? dto.ApiUrl
                    : (_configuration["Middleware:ApiUrl"] ?? "https://cloud.tbzlabs.in/api/events");

                var validateUrl = apiUrl.Replace("/api/events", "/api/labs/validate");
                var urlsToTry = new List<string> { validateUrl };
                if (!urlsToTry.Contains("http://localhost:5069/api/labs/validate")) urlsToTry.Add("http://localhost:5069/api/labs/validate");
                if (!urlsToTry.Contains("http://127.0.0.1:5069/api/labs/validate")) urlsToTry.Add("http://127.0.0.1:5069/api/labs/validate");

                HttpResponseMessage? response = null;
                using var client = new HttpClient(new SocketsHttpHandler
                {
                    ConnectCallback = async (connContext, token) =>
                    {
                        var addresses = await System.Net.Dns.GetHostAddressesAsync(connContext.DnsEndPoint.Host, token);
                        var candidates = addresses.OrderBy(ip => ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork ? 0 : 1).ToArray();

                        System.Net.Sockets.SocketException? lastSocketEx = null;
                        foreach (var targetIp in candidates)
                        {
                            var socket = new System.Net.Sockets.Socket(targetIp.AddressFamily, System.Net.Sockets.SocketType.Stream, System.Net.Sockets.ProtocolType.Tcp);
                            try
                            {
                                await socket.ConnectAsync(targetIp, connContext.DnsEndPoint.Port, token);
                                return new System.Net.Sockets.NetworkStream(socket, true);
                            }
                            catch (System.Net.Sockets.SocketException ex)
                            {
                                socket.Dispose();
                                lastSocketEx = ex;
                            }
                            catch
                            {
                                socket.Dispose();
                                throw;
                            }
                        }

                        throw lastSocketEx ?? new System.Net.Sockets.SocketException((int)System.Net.Sockets.SocketError.HostNotFound);
                    }
                });

                foreach (var targetUrl in urlsToTry)
                {
                    try
                    {
                        using var req = new HttpRequestMessage(HttpMethod.Post, targetUrl);
                        req.Headers.Add("X-Api-Key", rawKey);
                        var res = await client.SendAsync(req);
                        if (res.IsSuccessStatusCode)
                        {
                            response = res;
                            break;
                        }
                        else if (response == null)
                        {
                            response = res;
                        }
                    }
                    catch
                    {
                        // Ignore connection failure on fallback url
                    }
                }

                if (response != null && response.IsSuccessStatusCode)
                {
                    var responseBody = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseBody);
                    var root = doc.RootElement;

                    var labId = root.TryGetProperty("labId", out var idProp) ? idProp.GetString() : null;
                    var licenseStatus = root.TryGetProperty("licenseStatus", out var licProp) ? licProp.GetString() : "ACTIVE";
                    var licenseType = root.TryGetProperty("licenseType", out var typeProp) ? typeProp.GetString() : "COMMERCIAL";
                    int maximumBranches = 1;
                    if (root.TryGetProperty("maximumBranches", out var maxProp) && maxProp.TryGetInt32(out var mv))
                        maximumBranches = mv;
                    else if (root.TryGetProperty("MaximumBranches", out var maxProp2) && maxProp2.TryGetInt32(out var mv2))
                        maximumBranches = mv2;
                    var expiryDate = root.TryGetProperty("expiryDate", out var expProp) && expProp.ValueKind != JsonValueKind.Null ? expProp.GetString() : null;

                    var enabledFeatures = new List<string>();
                    if (root.TryGetProperty("enabledFeatures", out var featProp) && featProp.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var item in featProp.EnumerateArray())
                        {
                            var str = item.GetString();
                            if (str != null) enabledFeatures.Add(str);
                        }
                    }

                    // Attempt graceful local profile sync if DB already exists (optional, non-fatal if DB not yet created)
                    try
                    {
                        var connStr = _configuration.GetConnectionString("DefaultConnection");
                        if (!string.IsNullOrWhiteSpace(connStr))
                        {
                            var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
                            optionsBuilder.UseSqlServer(connStr);
                            using var context = new SynOSDbContext(optionsBuilder.Options);
                            var profile = await context.LabProfiles.FirstOrDefaultAsync();
                            if (profile != null)
                            {
                                await _licenseRecoveryService.ValidateKeyAndSyncProfileAsync(rawKey, context, profile);
                            }
                        }
                    }
                    catch
                    {
                        // Database is not yet created on fresh install Step 1; ignored gracefully
                    }

                    return Ok(new 
                    { 
                        success = true, 
                        message = "License activation successful.",
                        labId = labId,
                        licenseStatus = licenseStatus,
                        licenseType = licenseType,
                        maximumBranches = maximumBranches,
                        expiryDate = expiryDate,
                        enabledFeatures = enabledFeatures
                    });
                }
                else
                {
                    return Ok(new { success = false, message = "Invalid or unrecognized activation key. Please verify the key from TBZ Control Tower." });
                }
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = $"Activation error: {ex.Message}" });
            }
        }

        [HttpGet("defaults")]
        public async Task<IActionResult> GetConfigDefaults()
        {
            try
            {
                var connStr = _configuration.GetConnectionString("DefaultConnection");
                var server = "localhost";
                var database = "SynOSDb-1";
                var user = "sa";
                var password = "";
                string? detectedKey = null;
                bool hasExistingUsers = false;
                int userCount = 0;
                string? labName = null;

                if (!string.IsNullOrEmpty(connStr))
                {
                    try
                    {
                        var builder = new SqlConnectionStringBuilder(connStr);
                        server = builder.DataSource;
                        database = builder.InitialCatalog;
                        user = builder.UserID;
                        password = builder.Password;

                        var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
                        optionsBuilder.UseSqlServer(connStr);
                        using var dbContext = new SynOSDbContext(optionsBuilder.Options);
                        if (await dbContext.Database.CanConnectAsync())
                        {
                            var profile = await dbContext.LabProfiles.FirstOrDefaultAsync();
                            if (profile != null)
                            {
                                labName = profile.Name;
                                if (!string.IsNullOrWhiteSpace(profile.LicenseKey))
                                {
                                    detectedKey = LicenseKeyProtector.Unprotect(profile.LicenseKey);
                                }
                            }
                            try
                            {
                                hasExistingUsers = await dbContext.Users.AnyAsync();
                                if (hasExistingUsers)
                                {
                                    userCount = await dbContext.Users.CountAsync();
                                }
                            }
                            catch { }
                        }
                    }
                    catch { }
                }

                var pacsFolder = _configuration["Pacs:RootPath"] ?? "C:\\SynOS_Files\\PACS";
                var docFolder = _configuration["FileStorage:BasePath"] ?? "C:\\SynOS_Files";
                var workingDir = "C:\\SynOS_Working";

                return Ok(new
                {
                    databaseServer = server,
                    databaseName = database,
                    databaseUser = user,
                    databasePassword = password,
                    pacsStorageFolder = pacsFolder,
                    documentStorageFolder = docFolder,
                    workingDirectory = workingDir,
                    middlewareApiUrl = "https://cloud.tbzlabs.in/api/events",
                    detectedLicenseKey = detectedKey,
                    hasExistingUsers = hasExistingUsers,
                    userCount = userCount,
                    labName = labName
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private async Task<bool> CheckIsConfiguredInternal()
        {
            var clientPath = FindAppSettingsPath();
            if (!System.IO.File.Exists(clientPath))
            {
                return false;
            }

            var jsonText = await System.IO.File.ReadAllTextAsync(clientPath);
            var root = JsonNode.Parse(jsonText);
            var connStr = root?["ConnectionStrings"]?["DefaultConnection"]?.ToString();
            if (string.IsNullOrEmpty(connStr) || connStr.Contains("Server=YOUR_SERVER"))
            {
                return false;
            }

            var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
            optionsBuilder.UseSqlServer(connStr);
            using var context = new SynOSDbContext(optionsBuilder.Options);

            if (!await context.Database.CanConnectAsync())
            {
                return false;
            }

            // Diagnostics Instrumenting
            string queriedDbName = "Unknown";
            string queriedServerName = "Unknown";
            string maskedConnStr = "Unknown";
            string configuredServer = "Unknown";
            string configuredDb = "Unknown";
            bool tableExists = false;
            try
            {
                var connBuilder = new SqlConnectionStringBuilder(connStr);
                configuredServer = connBuilder.DataSource;
                configuredDb = connBuilder.InitialCatalog;
                if (!string.IsNullOrEmpty(connBuilder.Password))
                {
                    connBuilder.Password = "******";
                }
                maskedConnStr = connBuilder.ConnectionString;

                var conn = context.Database.GetDbConnection();
                var wasClosed = conn.State == System.Data.ConnectionState.Closed;
                if (wasClosed) await conn.OpenAsync();

                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT DB_NAME(), @@SERVERNAME, (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='LabProfiles')";
                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            queriedDbName = reader.IsDBNull(0) ? "NULL" : reader.GetString(0);
                            queriedServerName = reader.IsDBNull(1) ? "NULL" : reader.GetString(1);
                            var val = reader.GetValue(2);
                            if (val != null && val != DBNull.Value)
                            {
                                tableExists = Convert.ToInt32(val) > 0;
                            }
                        }
                    }
                }

                if (wasClosed) conn.Close();
            }
            catch (Exception dbEx)
            {
                Serilog.Log.Error($"[Setup-Diag] Failed to query DB_NAME() / @@SERVERNAME: {dbEx.Message}");
            }

            Serilog.Log.Information($"[Setup-Diag] Before LabProfiles check. ConnectionString='{maskedConnStr}', ConfiguredServer='{configuredServer}', ConfiguredDatabase='{configuredDb}', RealDBName='{queriedDbName}', RealServerName='{queriedServerName}'");
            Serilog.Log.Information($"[Setup-Diag] LabProfilesExists = {tableExists}");

            var hasProfile = await context.LabProfiles.AnyAsync();
            var hasUsers = await context.Users.AnyAsync();

            return hasProfile && hasUsers;
        }

        private string FindAppSettingsPath()
        {
            var paths = new[]
            {
                Path.Combine(AppContext.BaseDirectory, "appsettings.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "src", "SynOS.Api", "appsettings.json")
            };
            foreach (var path in paths)
            {
                if (System.IO.File.Exists(path)) return path;
            }
            return Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        }

        private void SetNodeValue(JsonNode root, string path, JsonNode? value)
        {
            var parts = path.Split(':');
            JsonNode current = root;
            for (int i = 0; i < parts.Length - 1; i++)
            {
                var part = parts[i];
                if (current[part] == null)
                {
                    current[part] = new JsonObject();
                }
                current = current[part]!;
            }
            current[parts[^1]] = value;
        }

        private string GenerateSecureKey(int length)
        {
            var bytes = new byte[length];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(bytes);
            }
            return Convert.ToBase64String(bytes);
        }

        private void EnsureDirectoriesExist(string docDir, string workDir)
        {
            try
            {
                if (!Directory.Exists(docDir)) Directory.CreateDirectory(docDir);
                if (!Directory.Exists(workDir)) Directory.CreateDirectory(workDir);

                // Create subfolders in WorkingDirectory automatically
                var subfolders = new[] { "Updates", "Backup", "Diagnostics", "Restore", "Temp" };
                foreach (var folder in subfolders)
                {
                    var subpath = Path.Combine(workDir, folder);
                    if (!Directory.Exists(subpath)) Directory.CreateDirectory(subpath);
                }
            }
            catch
            {
                // Ignore directory creation errors if permission issues; system will report during check
            }
        }
    }

    public class SetupInitializeDto
    {
        public bool IsReconnect { get; set; } = false;
        public string DatabaseServer { get; set; } = ".\\SYNOS";
        public string DatabaseName { get; set; } = "SynOSDb-1";
        public string? DatabaseUser { get; set; }
        public string? DatabasePassword { get; set; }

        public string? MiddlewareApiUrl { get; set; } = "https://cloud.tbzlabs.in/api/events";
        public string? MiddlewareApiKey { get; set; }
        public string? LabId { get; set; } = "LAB001";

        public string? LicenseType { get; set; }
        public int? MaximumBranches { get; set; }
        public string? LicenseExpiryDate { get; set; }
        public string? LicenseStatus { get; set; }
        public System.Collections.Generic.List<string>? EnabledFeatures { get; set; }

        public string? DocumentStorageFolder { get; set; } = "C:\\SynOS_Files";
        public string? PacsStorageFolder { get; set; } = "C:\\SynOS_Files\\PACS";
        public string? WorkingDirectory { get; set; } = "C:\\SynOS_Working";

        public string? AdminUsername { get; set; }
        public string? AdminPassword { get; set; }
        public string? AdminName { get; set; }
        public string? AdminEmail { get; set; }
    }

    public class SetupStateDto
    {
        public int CurrentStep { get; set; }
        public bool LicenseActivated { get; set; }
        public string? DatabaseServer { get; set; }
        public string? DatabaseName { get; set; }
        public string? AdminUsername { get; set; }
        public bool Completed { get; set; }
    }

    public class DiscoverDatabasesDto
    {
        public string? Server { get; set; }
        public string? User { get; set; }
        public string? Password { get; set; }
    }

    public class DiscoveredDatabaseDto
    {
        public string Name { get; set; } = null!;
        public bool HasUsers { get; set; }
        public int UserCount { get; set; }
        public string? LabName { get; set; }
        public List<string> AdminUsernames { get; set; } = new();
    }
}
