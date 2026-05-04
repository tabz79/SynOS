using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System;
using AutoMapper;
using SynOS.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Linq;
using BCrypt.Net;
using SynOS.Models.Entities.Operations;

namespace SynOS.Services
{
    public class AuthService : IAuthService
    {
        private readonly IConfiguration _configuration;
        private readonly IMapper _mapper;
        private readonly SynOSDbContext _context;
        private readonly IAuditService _auditService; // Injected

        public AuthService(IConfiguration configuration, IMapper mapper, SynOSDbContext context, IAuditService auditService)
        {
            _configuration = configuration;
            _mapper = mapper;
            _context = context;
            _auditService = auditService; // Assigned
        }

        public async Task<LoginResponse> Authenticate(LoginRequest request, string? ipAddress)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .SingleOrDefaultAsync(u => u.Email == request.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                if (user != null)
                {
                    user.FailedLoginAttempts++;
                    if (user.FailedLoginAttempts >= 5)
                    {
                        user.LockoutEnd = DateTime.UtcNow.AddMinutes(15);
                    }
                    await _context.SaveChangesAsync();
                }
                throw new UnauthorizedAccessException("Invalid credentials");
            }

            if (user.LockoutEnd > DateTime.UtcNow)
            {
                throw new UnauthorizedAccessException("Account is locked.");
            }

            if (!user.IsActive)
            {
                throw new UnauthorizedAccessException("Your account has been deactivated. Please contact your administrator.");
            }

            // Mode Resolution Logic (Phase 1B)
            bool canOperational = user.CanUseOperationalMode;
            bool canOversight = user.CanUseOversightMode;

            if (!canOperational && !canOversight)
            {
                throw new UnauthorizedAccessException("This account has no valid session mode configured. Please contact support.");
            }

            string selectedMode;
            if (!string.IsNullOrEmpty(request.PreferredMode))
            {
                selectedMode = request.PreferredMode.ToLower();
                if (selectedMode == "operational" && !canOperational) throw new UnauthorizedAccessException("Operational mode not allowed for this user.");
                if (selectedMode == "oversight" && !canOversight) throw new UnauthorizedAccessException("Oversight mode not allowed for this user.");
            }
            else
            {
                if (canOperational && canOversight)
                {
                    return new LoginResponse
                    {
                        RequiresModeSelection = true,
                        AvailableModes = new System.Collections.Generic.List<string> { "operational", "oversight" },
                        User = _mapper.Map<UserDto>(user)
                    };
                }
                selectedMode = canOperational ? "operational" : "oversight";
            }

            Guid? selectedBranchId = null;
            string? selectedBranchName = null;
            var primaryRole = user.UserRoles.FirstOrDefault()?.Role;
            string selectedRoleName = primaryRole?.Name ?? "Admin";
            Guid selectedRoleId = primaryRole?.RoleId ?? Guid.Empty;

            // Operational Mode: Require Branch and Update Resource
            if (selectedMode == "operational")
            {
                var userBranchRoles = await _context.UserBranchRoles
                    .Include(ubr => ubr.Role)
                    .Include(ubr => ubr.Branch)
                    .Where(ubr => ubr.UserId == user.UserId)
                    .ToListAsync();

                if (userBranchRoles.Count == 0)
                {
                    throw new UnauthorizedAccessException("No active branch assignment found for this operational user.");
                }

                if (request.BranchId.HasValue)
                {
                    var context = userBranchRoles.FirstOrDefault(ubr => ubr.BranchId == request.BranchId.Value);
                    if (context == null) throw new UnauthorizedAccessException("Unauthorized access to selected branch.");

                    selectedBranchId = context.BranchId;
                    selectedBranchName = context.Branch.Name;
                    selectedRoleName = context.Role.Name;
                    selectedRoleId = context.RoleId;
                }
                else if (userBranchRoles.Count == 1)
                {
                    var context = userBranchRoles.First();
                    selectedBranchId = context.BranchId;
                    selectedBranchName = context.Branch.Name;
                    selectedRoleName = context.Role.Name;
                    selectedRoleId = context.RoleId;
                }
                else
                {
                    return new LoginResponse
                    {
                        RequiresBranchSelection = true,
                        AvailableBranches = userBranchRoles
                            .Select(ubr => new BranchSummaryDto { BranchId = ubr.BranchId, Name = ubr.Branch.Name })
                            .GroupBy(b => b.BranchId)
                            .Select(g => g.First())
                            .ToList(),
                        User = _mapper.Map<UserDto>(user)
                    };
                }
            }

            var newSessionId = Guid.NewGuid();
            var departmentCode = "General";
            if (selectedMode == "operational")
            {
                var resource = await _context.OperationalResources.AsNoTracking().FirstOrDefaultAsync(r => r.UserId == user.UserId);
                
                // If resource exists, use its assigned department. 
                // If it's a new resource (resource == null), we need to determine the department from the user's role/branch context.
                if (resource != null && !string.IsNullOrEmpty(resource.DepartmentCode) && resource.DepartmentCode != "General")
                {
                    departmentCode = resource.DepartmentCode;
                }
                else
                {
                    // Heuristic: If they have a role like 'Biochemistry Technician', default to 'BIO'
                    departmentCode = selectedRoleName.Contains("Biochem", StringComparison.OrdinalIgnoreCase) ? "BIO" : 
                                     selectedRoleName.Contains("Hemat", StringComparison.OrdinalIgnoreCase) ? "HEM" : 
                                     selectedRoleName.Contains("Path", StringComparison.OrdinalIgnoreCase) ? "PAT" : "General";
                }
            }

            var jwtToken = GenerateJwtToken(user, selectedMode, selectedBranchId, selectedBranchName, selectedRoleName, selectedRoleId, newSessionId, departmentCode);
            var refreshToken = GenerateRefreshToken(ipAddress);
            refreshToken.SessionMode = selectedMode; // PERSIST MODE

            foreach (var rt in user.RefreshTokens.Where(t => t.IsActive))
            {
                rt.Revoked = DateTime.UtcNow;
                rt.RevokedByIp = ipAddress ?? string.Empty;
            }

            user.RefreshTokens.Add(refreshToken);

            // Operational Identity Sync
            if (selectedMode == "operational")
            {
                int retries = 0;
                bool saved = false;
                while (!saved && retries < 2)
                {
                    try
                    {
                        var resource = await _context.OperationalResources.FirstOrDefaultAsync(r => r.UserId == user.UserId);
                        if (resource != null)
                        {
                            resource.ActiveSessionId = newSessionId;
                            resource.LastSessionIssuedAt = DateTime.UtcNow;
                            resource.BranchId = selectedBranchId!.Value;
                            resource.IsOnline = false;
                        }
                        else
                        {
                            resource = new OperationalResource
                            {
                                UserId = user.UserId,
                                ActiveSessionId = newSessionId,
                                LastSessionIssuedAt = DateTime.UtcNow,
                                BranchId = selectedBranchId!.Value,
                                Role = selectedRoleName,
                                DepartmentCode = departmentCode, // Sync from context
                                IsOnline = false,
                                IsActive = true // Auto-activate for efficiency
                            };
                            _context.OperationalResources.Add(resource);
                        }

                        await _auditService.LogAsync(user.UserId, "Login", "User", user.UserId, new { IpAddress = ipAddress, BranchId = selectedBranchId, Mode = selectedMode });
                        await _context.SaveChangesAsync();
                        saved = true;
                    }
                    catch (DbUpdateConcurrencyException)
                    {
                        retries++;
                        if (retries >= 2) throw;
                        _context.Entry(user).State = EntityState.Detached; 
                    }
                }
            }
            else
            {
                // Oversight simple logging
                await _auditService.LogAsync(user.UserId, "Login", "User", user.UserId, new { IpAddress = ipAddress, Mode = selectedMode });
                await _context.SaveChangesAsync();
            }

            return new LoginResponse
            {
                AccessToken = jwtToken,
                RefreshToken = refreshToken.Token,
                ExpiresIn = _configuration.GetValue<int>("Jwt:ExpiryMinutes") * 60,
                User = _mapper.Map<UserDto>(user)
            };
        }

        public async Task<LoginResponse> RefreshToken(string token, string? ipAddress)
        {
            var user = await _context.Users
                .Include(u => u.RefreshTokens)
                .SingleOrDefaultAsync(u => u.RefreshTokens.Any(t => t.Token == token));

            if (user == null) throw new UnauthorizedAccessException("Invalid token");
            if (!user.IsActive) throw new UnauthorizedAccessException("Account is deactivated.");

            var refreshToken = user.RefreshTokens.Single(x => x.Token == token);
            if (!refreshToken.IsActive) throw new UnauthorizedAccessException("Invalid token");

            var sessionMode = refreshToken.SessionMode ?? "operational"; // Fallback for legacy tokens

            // Capability Revalidation
            if ((sessionMode == "operational" && !user.CanUseOperationalMode) || 
                (sessionMode == "oversight" && !user.CanUseOversightMode))
            {
                refreshToken.Revoked = DateTime.UtcNow;
                refreshToken.RevokedByIp = ipAddress ?? string.Empty;
                await _context.SaveChangesAsync();
                throw new UnauthorizedAccessException("Session capability has been revoked.");
            }

            var newRefreshToken = GenerateRefreshToken(ipAddress);
            newRefreshToken.SessionMode = sessionMode;
            refreshToken.Revoked = DateTime.UtcNow;
            refreshToken.RevokedByIp = ipAddress ?? string.Empty;
            refreshToken.ReplacedByToken = newRefreshToken.Token;

            foreach (var rt in user.RefreshTokens.Where(t => t.IsActive))
            {
                rt.Revoked = DateTime.UtcNow;
                rt.RevokedByIp = ipAddress ?? string.Empty;
            }

            user.RefreshTokens.Add(newRefreshToken);

            Guid? selectedBranchId = null;
            string? selectedBranchName = null;
            string selectedRoleName = "User";
            Guid selectedRoleId = user.UserRoles.FirstOrDefault()?.RoleId ?? Guid.Empty;

            if (sessionMode == "operational")
            {
                var userBranchRoles = await _context.UserBranchRoles
                   .Include(ubr => ubr.Role)
                   .Include(ubr => ubr.Branch) 
                   .Where(ubr => ubr.UserId == user.UserId)
                   .ToListAsync();

                if (userBranchRoles.Count == 1)
                {
                    var context = userBranchRoles.First();
                    selectedBranchId = context.BranchId;
                    selectedBranchName = context.Branch.Name;
                    selectedRoleName = context.Role.Name;
                    selectedRoleId = context.RoleId;
                }
                else
                {
                    if (userBranchRoles.Count > 1) throw new UnauthorizedAccessException("Multiple branches assigned. Please log in again to select a branch.");
                    throw new UnauthorizedAccessException("No active branch assignment found for this user.");
                }
            }
            else
            {
                var role = user.UserRoles.FirstOrDefault()?.Role;
                selectedRoleName = role?.Name ?? "Admin";
                selectedRoleId = role?.RoleId ?? Guid.Empty;
            }

            var newSessionId = Guid.NewGuid();
            if (sessionMode == "operational")
            {
                var resource = await _context.OperationalResources.FirstOrDefaultAsync(r => r.UserId == user.UserId);
                if (resource != null)
                {
                    resource.ActiveSessionId = newSessionId;
                    resource.LastSessionIssuedAt = DateTime.UtcNow;
                }
                else
                {
                    resource = new OperationalResource
                    {
                        UserId = user.UserId,
                        ActiveSessionId = newSessionId,
                        LastSessionIssuedAt = DateTime.UtcNow,
                        BranchId = selectedBranchId!.Value,
                        Role = selectedRoleName,
                        DepartmentCode = "General",
                        IsOnline = false,
                        IsActive = false
                    };
                    _context.OperationalResources.Add(resource);
                }
            }

            var departmentCode = "General";
            if (sessionMode == "operational")
            {
                var resource = await _context.OperationalResources.AsNoTracking().FirstOrDefaultAsync(r => r.UserId == user.UserId);
                if (resource != null && !string.IsNullOrEmpty(resource.DepartmentCode) && resource.DepartmentCode != "General")
                {
                    departmentCode = resource.DepartmentCode;
                }
                else
                {
                    departmentCode = selectedRoleName.Contains("Biochem", StringComparison.OrdinalIgnoreCase) ? "BIO" : 
                                     selectedRoleName.Contains("Hemat", StringComparison.OrdinalIgnoreCase) ? "HEM" : 
                                     selectedRoleName.Contains("Path", StringComparison.OrdinalIgnoreCase) ? "PAT" : "General";
                }
            }

            var jwtToken = GenerateJwtToken(user, sessionMode, selectedBranchId, selectedBranchName, selectedRoleName, selectedRoleId, newSessionId, departmentCode);
            await _auditService.LogAsync(user.UserId, "RefreshToken", "User", user.UserId, new { IpAddress = ipAddress, Mode = sessionMode });
            
            int refreshRetries = 0;
            bool refreshSaved = false;
            while (!refreshSaved && refreshRetries < 2)
            {
                try
                {
                    await _context.SaveChangesAsync();
                    refreshSaved = true;
                }
                catch (DbUpdateConcurrencyException)
                {
                    refreshRetries++;
                    if (refreshRetries >= 2) throw;
                    _context.Entry(user).State = EntityState.Detached;
                }
            }

            return new LoginResponse
            {
                AccessToken = jwtToken,
                RefreshToken = newRefreshToken.Token,
                ExpiresIn = _configuration.GetValue<int>("Jwt:ExpiryMinutes") * 60,
                User = _mapper.Map<UserDto>(user)
            };
        }

        public async Task<bool> Logout(string token, string? ipAddress)
        {
            var user = await _context.Users.Include(u => u.RefreshTokens).SingleOrDefaultAsync(u => u.RefreshTokens.Any(t => t.Token == token));
            if (user == null) return false;

            var refreshToken = user.RefreshTokens.Single(x => x.Token == token);
            if (!refreshToken.IsActive) return false;

            refreshToken.Revoked = DateTime.UtcNow;
            refreshToken.RevokedByIp = ipAddress ?? string.Empty; // Handle null ipAddress
            _context.Update(user);
            
            await _auditService.LogAsync(user.UserId, "Logout", "User", user.UserId, new { IpAddress = ipAddress });
            await _context.SaveChangesAsync();

            return true;
        }

        private string GenerateJwtToken(User user, string sessionMode, Guid? branchId, string? branchName, string roleName, Guid roleId, Guid sessionId, string departmentCode)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtSecret = _configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret not configured");
            var key = Encoding.ASCII.GetBytes(jwtSecret);
            
            var claimsList = new System.Collections.Generic.List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim("session_mode", sessionMode), // ADDED for Phase 1B
                new Claim("session_id", sessionId.ToString()), 
                new Claim("department_code", departmentCode), // ADDED for Department Workbench
                new Claim(ClaimTypes.Role, roleName),
                new Claim("RoleId", roleId.ToString())
            };

            if (sessionMode == "operational" && branchId.HasValue)
            {
                claimsList.Add(new Claim("branch_id", branchId.Value.ToString()));
                
                // ADDED: Operational Resource ID
                var resource = _context.OperationalResources.AsNoTracking().FirstOrDefault(r => r.UserId == user.UserId && r.BranchId == branchId.Value);
                if (resource != null)
                {
                    claimsList.Add(new Claim("resource_id", resource.OperationalResourceId.ToString()));
                }

                if (!string.IsNullOrEmpty(branchName))
                {
                    claimsList.Add(new Claim("branch_name", branchName));
                }
            }

            var claimsIdentity = new ClaimsIdentity(claimsList);

            var jwtExpiryMinutes = _configuration.GetValue<int>("Jwt:ExpiryMinutes", 60); // Default to 60 minutes
            var jwtIssuer = _configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Jwt:Issuer not configured");
            var jwtAudience = _configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Jwt:Audience not configured");

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = claimsIdentity,
                Expires = DateTime.UtcNow.AddMinutes(jwtExpiryMinutes),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = jwtIssuer,
                Audience = jwtAudience
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private RefreshToken GenerateRefreshToken(string? ipAddress)
        {
            using (var randomNumberGenerator = RandomNumberGenerator.Create())
            {
                var randomBytes = new byte[64];
                randomNumberGenerator.GetBytes(randomBytes);
                var refreshTokenExpiryDays = _configuration.GetValue<int>("Jwt:RefreshTokenExpiryDays", 7); // Default to 7 days
                return new RefreshToken
                {
                    Token = Convert.ToBase64String(randomBytes),
                    Expires = DateTime.UtcNow.AddDays(refreshTokenExpiryDays),
                    Created = DateTime.UtcNow,
                    CreatedByIp = ipAddress ?? string.Empty // Handle null ipAddress
                };
            }
        }
    }
}
