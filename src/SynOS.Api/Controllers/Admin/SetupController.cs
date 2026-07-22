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

        public SetupController(IConfiguration configuration, Microsoft.Extensions.Hosting.IHostApplicationLifetime lifetime)
        {
            _configuration = configuration;
            _lifetime = lifetime;
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetSetupStatus()
        {
            var isSetupProcess = System.Environment.GetCommandLineArgs().Contains("--setup");
            if (isSetupProcess)
            {
                var isConfigured = CheckIsConfiguredViaStateFile();
                return Ok(new { isConfigured });
            }

            try
            {
                var isConfigured = await CheckIsConfiguredInternal();
                return Ok(new { isConfigured });
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
                // Lock down: if already configured, reject
                if (CheckIsConfiguredViaStateFile())
                {
                    return BadRequest(new { message = "System is already configured and locked down." });
                }

                // Build Connection String
                var connBuilder = new SqlConnectionStringBuilder
                {
                    DataSource = dto.DatabaseServer,
                    InitialCatalog = dto.DatabaseName,
                    TrustServerCertificate = true,
                    MultipleActiveResultSets = true,
                    Encrypt = true
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
                catch (SqlException sqlEx)
                {
                    Serilog.Log.Error($"[Setup] SQL Exception: Number={sqlEx.Number}, State={sqlEx.State}, Message={sqlEx.Message}");
                    throw;
                }
                catch (Exception ex)
                {
                    Serilog.Log.Error($"[Setup] Exception: Message={ex.Message}");
                    throw;
                }

                // Validate Connection & Run Migrations targeting the new database
                var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
                optionsBuilder.UseSqlServer(connStr);
                using var context = new SynOSDbContext(optionsBuilder.Options);

                try
                {
                    Serilog.Log.Information("[Setup] Running EF migrations...");
                    await context.Database.MigrateAsync();
                    Serilog.Log.Information("[Setup] Migrations completed.");

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
                          END"
                    };

                    foreach (var query in manualQueries)
                    {
                        await context.Database.ExecuteSqlRawAsync(query);
                    }
                    Serilog.Log.Information("[Setup] Manual schema adjustments applied successfully.");
                }
                catch (SqlException sqlEx)
                {
                    Serilog.Log.Error($"[Setup] SQL Exception during migrations: Number={sqlEx.Number}, State={sqlEx.State}, Message={sqlEx.Message}");
                    throw;
                }
                catch (Exception ex)
                {
                    Serilog.Log.Error($"[Setup] Exception during migrations: Message={ex.Message}");
                    throw;
                }

                // Seed Base Tables
                DbInitializer.Initialize(context);

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

                profile.ReportStorageFolder = dto.DocumentStorageFolder;
                profile.WorkingDirectory = dto.WorkingDirectory;
                profile.MiddlewareApiUrl = !string.IsNullOrWhiteSpace(dto.MiddlewareApiUrl) ? dto.MiddlewareApiUrl : (_configuration["Middleware:ApiUrl"] ?? "https://cloud.tbzlabs.in/api/events");
                profile.MiddlewareApiKey = !string.IsNullOrWhiteSpace(dto.MiddlewareApiKey) ? dto.MiddlewareApiKey : _configuration["Middleware:ApiKey"];
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
                EnsureDirectoriesExist(dto.DocumentStorageFolder, dto.WorkingDirectory);

                // Create Admin User
                var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.Name.ToLower() == "admin");
                if (adminRole == null)
                {
                    return StatusCode(500, new { message = "Seeded Admin role not found. Please contact support." });
                }

                User newUser = null;
                var adminUsernameClean = dto.AdminUsername.Contains("@") ? dto.AdminUsername.Split('@')[0] : dto.AdminUsername;
                var existingUser = await context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == adminUsernameClean.ToLower() || u.Email.ToLower() == dto.AdminUsername.ToLower());
                if (existingUser == null)
                {
                    var userId = Guid.NewGuid();
                    newUser = new User
                    {
                        UserId = userId,
                        Username = adminUsernameClean,
                        Email = dto.AdminUsername,
                        Name = "Administrator",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.AdminPassword),
                        IsActive = true,
                        Designation = "Administrator",
                        IsDefaultSignatory = true,
                        CanUseOperationalMode = true,
                        CanUseOversightMode = true
                    };
                    context.Users.Add(newUser);

                    // Add role assignment in UserBranchRoles
                    var defaultBranch = await context.Branches.FirstOrDefaultAsync();
                    var branchId = defaultBranch?.BranchId ?? Guid.Empty;
                    context.UserBranchRoles.Add(new UserBranchRole
                    {
                        UserBranchRoleId = Guid.NewGuid(),
                        UserId = userId,
                        BranchId = branchId,
                        RoleId = adminRole.RoleId
                    });

                    // Add role assignment in UserRoles
                    context.UserRoles.Add(new UserRole
                    {
                        UserId = userId,
                        RoleId = adminRole.RoleId
                    });

                    // Grant access to all workspaces
                    var workspaces = await context.Workspaces.ToListAsync();
                    foreach (var ws in workspaces)
                    {
                        context.UserWorkspaceAccesses.Add(new UserWorkspaceAccess
                        {
                            UserWorkspaceAccessId = Guid.NewGuid(),
                            UserId = userId,
                            WorkspaceId = ws.WorkspaceId
                        });
                    }

                    // Add Employee record with all required fields to align dual provisioning
                    context.Employees.Add(new Employee
                    {
                        EmployeeId = Guid.NewGuid(),
                        UserId = userId,
                        FirstName = "Admin",
                        LastName = "User",
                        Email = newUser.Email,
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
                    existingUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.AdminPassword);
                    existingUser.IsActive = true;
                }

                // Delete default seeded "admin" if different to prevent default security vulnerability
                if (!string.Equals(dto.AdminUsername, "admin", StringComparison.OrdinalIgnoreCase))
                {
                    var defaultSeedAdmin = await context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == "admin");
                    if (defaultSeedAdmin != null)
                    {
                        var targetUserId = newUser?.UserId ?? existingUser?.UserId ?? Guid.Empty;
                        
                        // Re-assign report templates CreatedBy
                        var templates = await context.ReportTemplates
                            .Where(t => t.CreatedBy == defaultSeedAdmin.UserId)
                            .ToListAsync();
                        foreach (var template in templates)
                        {
                            template.CreatedBy = targetUserId;
                        }

                        // Remove related UserWorkspaceAccesses
                        var uwa = await context.UserWorkspaceAccesses
                            .Where(x => x.UserId == defaultSeedAdmin.UserId)
                            .ToListAsync();
                        context.UserWorkspaceAccesses.RemoveRange(uwa);

                        // Remove related UserRoles
                        var ur = await context.UserRoles
                            .Where(x => x.UserId == defaultSeedAdmin.UserId)
                            .ToListAsync();
                        context.UserRoles.RemoveRange(ur);

                        // Remove related UserBranchRoles
                        var ubr = await context.UserBranchRoles
                            .Where(x => x.UserId == defaultSeedAdmin.UserId)
                            .ToListAsync();
                        context.UserBranchRoles.RemoveRange(ubr);

                        // Remove related Employees
                        var emp = await context.Employees
                            .Where(x => x.UserId == defaultSeedAdmin.UserId)
                            .ToListAsync();
                        context.Employees.RemoveRange(emp);

                        context.Users.Remove(defaultSeedAdmin);
                    }
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
                        SetNodeValue(root, "Pacs:RootPath", JsonValue.Create(dto.PacsStorageFolder));
                        SetNodeValue(root, "FileStorage:BasePath", JsonValue.Create(dto.DocumentStorageFolder));
                        SetNodeValue(root, "FileStorage:PublicBaseUrl", JsonValue.Create("http://localhost:59999/files"));
                        SetNodeValue(root, "SecureLink:BaseUrl", JsonValue.Create("http://localhost:59999/secure"));
                        SetNodeValue(root, "SecureLink:PublicBaseUrl", JsonValue.Create("http://localhost:59999/secure"));
                        SetNodeValue(root, "Middleware:LabId", JsonValue.Create(dto.LabId ?? "LAB001"));
                        SetNodeValue(root, "Middleware:ApiUrl", JsonValue.Create(dto.MiddlewareApiUrl));
                        SetNodeValue(root, "Middleware:ApiKey", JsonValue.Create(dto.MiddlewareApiKey));

                        var writeOptions = new JsonSerializerOptions { WriteIndented = true };
                        await System.IO.File.WriteAllTextAsync(clientPath, JsonSerializer.Serialize(root, writeOptions));
                    }
                }

                SynOS.Api.Services.SystemSetupState.IsConfigured = true;

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

                // 2. Start the Windows Service
                try
                {
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
                            // Fallback: Start the service via an elevated cmd process (triggers UAC if not elevated)
                            var psi = new System.Diagnostics.ProcessStartInfo
                            {
                                FileName = "cmd.exe",
                                Arguments = "/c net start TBZSynOSService",
                                Verb = "runas",
                                UseShellExecute = true,
                                WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden
                            };
                            using (var p = System.Diagnostics.Process.Start(psi))
                            {
                                if (p != null)
                                {
                                    await p.WaitForExitAsync();
                                }
                            }
                            Serilog.Log.Information("[Setup] Elevated service start command completed.");
                        }
                    }
                }
                catch (Exception ex)
                {
                    Serilog.Log.Error($"[Setup] Failed to start Windows Service: {ex.Message}");
                }

                // 3. Trigger self-termination after 1 second
                _ = Task.Run(async () =>
                {
                    await Task.Delay(1000);
                    _lifetime.StopApplication();
                });

                var host = Request.Host.Host ?? "localhost";
                var servicePort = SynOS.Api.Services.SystemSetupState.ServicePort;
                var serviceStatusUrl = $"http://{host}:{servicePort}/api/v1/setup/status";
                var loginUrl = $"http://{host}:{servicePort}/login";

                return Ok(new { success = true, serviceStatusUrl = serviceStatusUrl, loginUrl = loginUrl });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("test-db")]
        public async Task<IActionResult> TestDbConnection([FromBody] DbConnectionDto dto)
        {
            if (CheckIsConfiguredViaStateFile())
            {
                return BadRequest(new { message = "System is already configured." });
            }

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

        [HttpPost("test-path")]
        public async Task<IActionResult> TestPathPermissions([FromBody] PathDto dto)
        {
            if (CheckIsConfiguredViaStateFile())
            {
                return BadRequest(new { message = "System is already configured." });
            }

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
            if (CheckIsConfiguredViaStateFile())
            {
                return BadRequest(new { message = "System is already configured." });
            }

            try
            {
                var handler = new System.Net.Http.SocketsHttpHandler
                {
                    ConnectCallback = async (context, cancellationToken) =>
                    {
                        var ipAddresses = await System.Net.Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, cancellationToken);
                        var ipv4Address = ipAddresses.FirstOrDefault(ip => ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);
                        var socket = new System.Net.Sockets.Socket(System.Net.Sockets.SocketType.Stream, System.Net.Sockets.ProtocolType.Tcp);
                        socket.NoDelay = true;
                        try
                        {
                            await socket.ConnectAsync(new System.Net.IPEndPoint(ipv4Address ?? ipAddresses.First(), context.DnsEndPoint.Port), cancellationToken);
                            return new System.Net.Sockets.NetworkStream(socket, ownsSocket: true);
                        }
                        catch
                        {
                            socket.Dispose();
                            throw;
                        }
                    }
                };
                using var client = new System.Net.Http.HttpClient(handler);
                
                var testUrl = dto.ApiUrl?.Replace("/api/events", "/api/labs/validate") ?? "http://localhost:5069/api/labs/validate";
                
                var request = new HttpRequestMessage(HttpMethod.Post, testUrl);
                if (!string.IsNullOrEmpty(dto.ApiKey))
                {
                    request.Headers.Add("X-Api-Key", dto.ApiKey);
                }

                var response = await client.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();
                
                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    var root = doc.RootElement;
                    var labId = root.TryGetProperty("labId", out var idProp) ? idProp.GetString() : null;
                    var labName = root.TryGetProperty("labName", out var nameProp) ? nameProp.GetString() : null;
                    var licenseStatus = root.TryGetProperty("licenseStatus", out var licProp) ? licProp.GetString() : null;
                    var licenseType = root.TryGetProperty("licenseType", out var typeProp) ? typeProp.GetString() : null;
                    int maximumBranches = 1;
                    if (root.TryGetProperty("maximumBranches", out var maxProp) && maxProp.TryGetInt32(out var mv))
                        maximumBranches = mv;
                    else if (root.TryGetProperty("MaximumBranches", out var maxProp2) && maxProp2.TryGetInt32(out var mv2))
                        maximumBranches = mv2;
                    var expiryDate = root.TryGetProperty("expiryDate", out var expProp) && expProp.ValueKind != JsonValueKind.Null ? expProp.GetString() : null;
                    
                    var enabledFeatures = new System.Collections.Generic.List<string>();
                    if (root.TryGetProperty("enabledFeatures", out var featProp) && featProp.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var item in featProp.EnumerateArray())
                        {
                            var str = item.GetString();
                            if (str != null) enabledFeatures.Add(str);
                        }
                    }

                    return Ok(new 
                    { 
                        success = true, 
                        message = "License activation successful.",
                        labId = labId,
                        labName = labName,
                        licenseStatus = licenseStatus,
                        licenseType = licenseType,
                        maximumBranches = maximumBranches,
                        expiryDate = expiryDate,
                        enabledFeatures = enabledFeatures
                    });
                }
                else
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    var root = doc.RootElement;
                    var error = root.TryGetProperty("error", out var errProp) ? errProp.GetString() : "Middleware returned failure.";
                    return Ok(new { success = false, message = error });
                }
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("defaults")]
        public async Task<IActionResult> GetConfigDefaults()
        {
            if (CheckIsConfiguredViaStateFile())
            {
                return BadRequest(new { message = "System is already configured." });
            }

            try
            {
                var connStr = _configuration.GetConnectionString("DefaultConnection");
                var server = "localhost";
                var database = "SynOSDb";
                var user = "sa";
                var password = "";

                if (!string.IsNullOrEmpty(connStr))
                {
                    try
                    {
                        var builder = new SqlConnectionStringBuilder(connStr);
                        server = builder.DataSource;
                        database = builder.InitialCatalog;
                        user = builder.UserID;
                        password = builder.Password;
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
                    middlewareApiUrl = "https://cloud.tbzlabs.in/api/events"
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
        public string DatabaseServer { get; set; } = null!;
        public string DatabaseName { get; set; } = null!;
        public string DatabaseUser { get; set; } = null!;
        public string DatabasePassword { get; set; } = null!;

        public string MiddlewareApiUrl { get; set; } = null!;
        public string MiddlewareApiKey { get; set; } = null!;
        public string LabId { get; set; } = "LAB001";

        public string? LicenseType { get; set; }
        public int? MaximumBranches { get; set; }
        public string? LicenseExpiryDate { get; set; }
        public string? LicenseStatus { get; set; }
        public System.Collections.Generic.List<string>? EnabledFeatures { get; set; }

        public string DocumentStorageFolder { get; set; } = null!;
        public string PacsStorageFolder { get; set; } = null!;
        public string WorkingDirectory { get; set; } = null!;

        public string AdminUsername { get; set; } = null!;
        public string AdminPassword { get; set; } = null!;
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
}
