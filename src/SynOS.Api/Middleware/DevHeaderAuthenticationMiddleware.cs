using System.Text;
using System.Text.Json;
using System.Security.Claims;
using Microsoft.Extensions.Options;

namespace SynOS.Api.Middleware;

/// <summary>
/// A development-only middleware to bypass JWT authentication by accepting a user definition in a request header.
/// </summary>
public class DevHeaderAuthenticationMiddleware
{
    private readonly RequestDelegate _next;

    public DevHeaderAuthenticationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue("X-DEV-USER", out var headerValue))
        {
            try
            {
                var userJson = headerValue.ToString();
                var devUser = JsonSerializer.Deserialize<DevUser>(userJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (devUser != null && !string.IsNullOrEmpty(devUser.Id) && !string.IsNullOrEmpty(devUser.Name))
                {
                    var claims = new List<Claim>
                    {
                        new(ClaimTypes.NameIdentifier, devUser.Id),
                        new(ClaimTypes.Name, devUser.Name)
                    };

                    if (devUser.Roles != null)
                    {
                        foreach (var role in devUser.Roles)
                        {
                            claims.Add(new Claim(ClaimTypes.Role, role));
                        }
                    }
                    
                    var identity = new ClaimsIdentity(claims, "DevHeaderAuth");
                    context.User = new ClaimsPrincipal(identity);
                }
            }
            catch (JsonException ex)
            {
                // Log the error but don't disrupt the pipeline for a malformed dev header
                Console.WriteLine($"[WARN] Could not deserialize X-DEV-USER header: {ex.Message}");
            }
        }

        await _next(context);
    }

    private class DevUser
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string[]? Roles { get; set; }
    }
}