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

        public SetupController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetSetupStatus()
        {
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
                if (await CheckIsConfiguredInternal())
                {
                    return BadRequest(new { message = "System is already configured and locked down." });
                }

                // Build Connection String
                var connBuilder = new SqlConnectionStringBuilder
                {
                    DataSource = dto.DatabaseServer,
                    InitialCatalog = dto.DatabaseName,
                    UserID = dto.DatabaseUser,
                    Password = dto.DatabasePassword,
                    TrustServerCertificate = true,
                    MultipleActiveResultSets = true,
                    Encrypt = true
                };
                var connStr = connBuilder.ConnectionString;

                // Validate Connection & Run Migrations
                var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
                optionsBuilder.UseSqlServer(connStr);
                using var context = new SynOSDbContext(optionsBuilder.Options);

                // Run migration
                await context.Database.MigrateAsync();

                // Seed Base Tables
                DbInitializer.Initialize(context);

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
                profile.MiddlewareApiUrl = dto.MiddlewareApiUrl;
                profile.MiddlewareApiKey = dto.MiddlewareApiKey;
                profile.LabId = dto.LabId ?? "LAB001";
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
                profile.BackupEncryptionKey = GenerateSecureKey(32);
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

                var existingUser = await context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == dto.AdminUsername.ToLower());
                if (existingUser == null)
                {
                    var userId = Guid.NewGuid();
                    var newUser = new User
                    {
                        UserId = userId,
                        Username = dto.AdminUsername,
                        Email = $"{dto.AdminUsername}@synos-lab.internal",
                        Name = "Administrator",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.AdminPassword),
                        IsActive = true,
                        Designation = "Administrator",
                        IsDefaultSignatory = true,
                        CanUseOperationalMode = true,
                        CanUseOversightMode = true
                    };
                    context.Users.Add(newUser);

                    // Add role assignment
                    var defaultBranch = await context.Branches.FirstOrDefaultAsync();
                    var branchId = defaultBranch?.BranchId ?? Guid.Empty;
                    context.UserBranchRoles.Add(new UserBranchRole
                    {
                        UserBranchRoleId = Guid.NewGuid(),
                        UserId = userId,
                        BranchId = branchId,
                        RoleId = adminRole.RoleId
                    });

                    // Add Employee record to align dual provisioning
                    context.Employees.Add(new Employee
                    {
                        EmployeeId = Guid.NewGuid(),
                        UserId = userId,
                        FirstName = "Admin",
                        LastName = "User",
                        Email = newUser.Email,
                        IsActive = true
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
                        context.Users.Remove(defaultSeedAdmin);
                    }
                }

                await context.SaveChangesAsync();

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

                return Ok(new { success = true, message = "System initialized and configured successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("test-db")]
        public async Task<IActionResult> TestDbConnection([FromBody] DbConnectionDto dto)
        {
            if (await CheckIsConfiguredInternal())
            {
                return BadRequest(new { message = "System is already configured." });
            }

            try
            {
                var connBuilder = new SqlConnectionStringBuilder
                {
                    DataSource = dto.Server,
                    InitialCatalog = dto.Database,
                    UserID = dto.User,
                    Password = dto.Password,
                    TrustServerCertificate = true,
                    MultipleActiveResultSets = true,
                    Encrypt = true
                };
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
            if (await CheckIsConfiguredInternal())
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
            if (await CheckIsConfiguredInternal())
            {
                return BadRequest(new { message = "System is already configured." });
            }

            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.Timeout = TimeSpan.FromSeconds(5);
                
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
            return Path.Combine(Directory.GetCurrentDirectory(), "src", "SynOS.Api", "appsettings.json");
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
}
