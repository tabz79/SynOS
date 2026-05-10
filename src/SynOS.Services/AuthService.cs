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

            // Mode Resolution Logic (Removed hard modes)
            string selectedMode = "operational"; // Unified mode
            
            Guid? selectedBranchId = null;
            string? selectedBranchName = null;
            var primaryRole = user.UserRoles.FirstOrDefault()?.Role;
            string selectedRoleName = primaryRole?.Name ?? "Admin";
            Guid selectedRoleId = primaryRole?.RoleId ?? Guid.Empty;

            // Fetch Branch Assignments
            var userBranchRoles = await _context.UserBranchRoles
                .Include(ubr => ubr.Role)
                .Include(ubr => ubr.Branch)
                .Where(ubr => ubr.UserId == user.UserId)
                .ToListAsync();

            // If user has branch assignments, they must pick one or use the only one assigned
            if (userBranchRoles.Count > 0)
            {
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
                    // Multiple branches, but no selection provided
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
            
            // Sync Operational Resource (Internal safeguard)
            var resource = await _context.OperationalResources.FirstOrDefaultAsync(r => r.UserId == user.UserId);
            if (resource != null)
            {
                resource.ActiveSessionId = newSessionId;
                resource.LastSessionIssuedAt = DateTime.UtcNow;
                if (selectedBranchId.HasValue) resource.BranchId = selectedBranchId.Value;
                
                if (!string.IsNullOrEmpty(resource.DepartmentCode) && resource.DepartmentCode != "General")
                {
                    departmentCode = resource.DepartmentCode;
                }
            }
            else if (selectedBranchId.HasValue)
            {
                resource = new OperationalResource
                {
                    UserId = user.UserId,
                    ActiveSessionId = newSessionId,
                    LastSessionIssuedAt = DateTime.UtcNow,
                    BranchId = selectedBranchId.Value,
                    Role = selectedRoleName,
                    DepartmentCode = "General",
                    IsOnline = false,
                    IsActive = true
                };
                _context.OperationalResources.Add(resource);
            }

            var jwtToken = GenerateJwtToken(user, selectedMode, selectedBranchId, selectedBranchName, selectedRoleName, selectedRoleId, newSessionId, departmentCode);
            var refreshToken = GenerateRefreshToken(ipAddress);
            refreshToken.SessionMode = selectedMode;

            foreach (var rt in user.RefreshTokens.Where(t => t.IsActive))
            {
                rt.Revoked = DateTime.UtcNow;
                rt.RevokedByIp = ipAddress ?? string.Empty;
            }

            user.RefreshTokens.Add(refreshToken);
            
            await _auditService.LogAsync(user.UserId, "Login", "User", user.UserId, new { IpAddress = ipAddress, BranchId = selectedBranchId });
            await _context.SaveChangesAsync();

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
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .SingleOrDefaultAsync(u => u.RefreshTokens.Any(t => t.Token == token));

            if (user == null) throw new UnauthorizedAccessException("Invalid token");
            if (!user.IsActive) throw new UnauthorizedAccessException("Account is deactivated.");

            var refreshToken = user.RefreshTokens.Single(x => x.Token == token);
            if (!refreshToken.IsActive) throw new UnauthorizedAccessException("Invalid token");

            var selectedMode = "operational";

            var newRefreshToken = GenerateRefreshToken(ipAddress);
            newRefreshToken.SessionMode = selectedMode;
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
            var primaryRole = user.UserRoles.FirstOrDefault()?.Role;
            string selectedRoleName = primaryRole?.Name ?? "Admin";
            Guid selectedRoleId = primaryRole?.RoleId ?? Guid.Empty;

            // Fetch Branch Assignments
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
            else if (userBranchRoles.Count > 1)
            {
                // If they have multiple branches, we can't easily auto-select one during refresh if it's not in the old token.
                // However, we usually store the branch_id in the RefreshToken or similar if we wanted to be robust.
                // For now, if multiple branches exist, we might force a re-login if we can't resolve it.
                // But let's check if the old refreshToken had a branch? No, it didn't.
                // We'll just take the first one or throw.
                var context = userBranchRoles.First();
                selectedBranchId = context.BranchId;
                selectedBranchName = context.Branch.Name;
            }

            var newSessionId = Guid.NewGuid();
            var departmentCode = "General";
            
            var resource = await _context.OperationalResources.FirstOrDefaultAsync(r => r.UserId == user.UserId);
            if (resource != null)
            {
                resource.ActiveSessionId = newSessionId;
                resource.LastSessionIssuedAt = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(resource.DepartmentCode)) departmentCode = resource.DepartmentCode;
            }

            var jwtToken = GenerateJwtToken(user, selectedMode, selectedBranchId, selectedBranchName, selectedRoleName, selectedRoleId, newSessionId, departmentCode);
            await _auditService.LogAsync(user.UserId, "RefreshToken", "User", user.UserId, new { IpAddress = ipAddress });
            await _context.SaveChangesAsync();

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
