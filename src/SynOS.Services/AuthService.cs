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

            user.FailedLoginAttempts = 0;
            await _context.SaveChangesAsync();

            var jwtToken = GenerateJwtToken(user);
            var refreshToken = GenerateRefreshToken(ipAddress);
            user.RefreshTokens.Add(refreshToken);

            await _auditService.LogAsync(user.UserId, "Login", "User", user.UserId, new { IpAddress = ipAddress });

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

            var jwtToken = GenerateJwtToken(user);
            
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

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtSecret = _configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret not configured");
            var key = Encoding.ASCII.GetBytes(jwtSecret);
            var claims = new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name),
            });

            foreach (var userRole in user.UserRoles)
            {
                claims.AddClaim(new Claim(ClaimTypes.Role, userRole.Role?.Name ?? string.Empty));
            }

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
