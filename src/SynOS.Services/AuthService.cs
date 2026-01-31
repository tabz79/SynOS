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

            // Context Selection Logic (Phase 1: Auto-select single branch)
            var userBranchRoles = await _context.UserBranchRoles
                .Include(ubr => ubr.Role)
                .Include(ubr => ubr.Branch) // ADDED: Fetch Branch for Name
                .Where(ubr => ubr.UserId == user.UserId)
                .ToListAsync();

            Guid selectedBranchId;
            string selectedRoleName;
            string selectedBranchName; // ADDED

            if (userBranchRoles.Count >= 1)
            {
                // Default to the first branch (Primary Context)
                // In Phase 2, we will allow selecting this via a separate endpoint or login param.
                var context = userBranchRoles.First();
                selectedBranchId = context.BranchId;
                selectedBranchName = context.Branch.Name;
                selectedRoleName = context.Role.Name;
            }
            else
            {
                // No branch assigned. Fail secure.
                throw new UnauthorizedAccessException("No active branch assignment found for this user.");
            }

            var jwtToken = GenerateJwtToken(user, selectedBranchId, selectedBranchName, selectedRoleName);
            var refreshToken = GenerateRefreshToken(ipAddress);
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
            // ... (existing refresh logic needs to persist branch context? 
            // For Phase 1, we can re-resolve or store branch in RefreshToken?
            // RefreshToken entity doesn't have BranchId.
            // I will re-resolve using the same logic as Login for now.
            // This assumes role/branch assignment hasn't changed.
            
            var user = await _context.Users
                .Include(u => u.RefreshTokens)
                // .Include(u => u.UserRoles) // Deprecated
                .SingleOrDefaultAsync(u => u.RefreshTokens.Any(t => t.Token == token));

            if (user == null) throw new UnauthorizedAccessException("Invalid token");

            if (!user.IsActive) throw new UnauthorizedAccessException("Account is deactivated.");

            var refreshToken = user.RefreshTokens.Single(x => x.Token == token);

            if (!refreshToken.IsActive) throw new UnauthorizedAccessException("Invalid token");

            // rotate token
            var newRefreshToken = GenerateRefreshToken(ipAddress);
            refreshToken.Revoked = DateTime.UtcNow;
            refreshToken.RevokedByIp = ipAddress ?? string.Empty; // Handle null ipAddress
            refreshToken.ReplacedByToken = newRefreshToken.Token;
            user.RefreshTokens.Add(newRefreshToken);

            _context.Update(user);
            await _context.SaveChangesAsync();

            // Re-resolve branch context
             var userBranchRoles = await _context.UserBranchRoles
                .Include(ubr => ubr.Role)
                .Include(ubr => ubr.Branch) // ADDED: Fetch Branch for Name
                .Where(ubr => ubr.UserId == user.UserId)
                .ToListAsync();

            Guid selectedBranchId;
            string selectedRoleName;
            string selectedBranchName; // ADDED

            if (userBranchRoles.Count == 1)
            {
                var context = userBranchRoles.First();
                selectedBranchId = context.BranchId;
                selectedBranchName = context.Branch.Name; // ADDED
                selectedRoleName = context.Role.Name;
            }
            else
            {
                 // Fallback or Fail. For Refresh, if they became multi-branch, this might break.
                 // Phase 1 assumption: 1 user = 1 branch.
                 if (userBranchRoles.Count > 1) throw new UnauthorizedAccessException("Multiple branches. Please log in again.");
                 throw new UnauthorizedAccessException("No branch assignment.");
            }

            var jwtToken = GenerateJwtToken(user, selectedBranchId, selectedBranchName, selectedRoleName);
            
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

        private string GenerateJwtToken(User user, Guid branchId, string branchName, string roleName)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtSecret = _configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret not configured");
            var key = Encoding.ASCII.GetBytes(jwtSecret);
            var claims = new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim("branch_id", branchId.ToString()),
                new Claim("branch_name", branchName), // ADDED: Branch Name Claim (Truth)
                new Claim(ClaimTypes.Role, roleName)
            });

            var jwtExpiryMinutes = _configuration.GetValue<int>("Jwt:ExpiryMinutes", 60); // Default to 60 minutes
            var jwtIssuer = _configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Jwt:Issuer not configured");
            var jwtAudience = _configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Jwt:Audience not configured");

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = claims,
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
