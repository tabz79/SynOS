// File: src/SynOS.Api/Program.cs
// Author: Gemini
// Date: 2025-11-13

using Microsoft.EntityFrameworkCore;
using Serilog;
using SynOS.Data;
using SynOS.Services;
using AutoMapper; // Added for IMapper
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using SynOS.Api.Middleware;
using Microsoft.Extensions.Logging;
using SynOS.Api.BackgroundServices;
using SynOS.Api.Hubs;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.OpenApi.Models; // Added for Swagger JWT configuration
using SynOS.Services.Storage;
using SynOS.Services.Stubs;
using SynOS.Models.Configuration;
using SynOS.Services.Security;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/synos-api-.txt", rollingInterval: RollingInterval.Day) // Stub for file sink
    .CreateLogger();
builder.Host.UseSerilog();

// Add services to the container.
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(option =>
{
    option.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter a valid token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "Bearer"
    });
    option.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// Configure DbContext
builder.Services.AddDbContext<SynOSDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secret = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret not configured.");
var issuer = jwtSettings["Issuer"];
var audience = jwtSettings["Audience"];
var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = securityKey
    };
});

// Add Authorization Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminPolicy", policy => policy.RequireRole("Admin"));
    options.AddPolicy("ReceptionPolicy", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole("Receptionist") || context.User.IsInRole("Admin")));
    options.AddPolicy("PhlebotomyPolicy", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole("Phlebotomist") || context.User.IsInRole("Admin")));
    options.AddPolicy("PathologyPolicy", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole("Pathologist") || context.User.IsInRole("Admin")));
    options.AddPolicy("RadiologyPolicy", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole("Radiologist") || context.User.IsInRole("XRayTech") || context.User.IsInRole("MriTech") || context.User.IsInRole("Admin")));
    options.AddPolicy("DeliveryPolicy", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole("DeliveryDesk") || context.User.IsInRole("Admin")));
});

// Add AutoMapper
builder.Services.AddAutoMapper(typeof(Program)); // Scans for profiles in the assembly

// Register application services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPatientService, PatientService>();
builder.Services.AddScoped<IVisitService, VisitService>();
builder.Services.AddScoped<IEditLockService, EditLockService>();
builder.Services.AddScoped<ISampleService, SampleService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IReceptionFlowService, ReceptionFlowService>();
builder.Services.AddScoped<IResultService, ResultService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<ICriticalValueService, CriticalValueService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<ISampleNotifier, SampleNotifier>(); // Register notifier
builder.Services.AddScoped<IReportTemplateService, ReportTemplateService>(); // Register new service
builder.Services.AddScoped<IReportPdfRenderer, QuestPdfReportRenderer>(); // Register new service
builder.Services.AddScoped<IRadiologyService, RadiologyService>(provider =>
    new RadiologyService(
        provider.GetRequiredService<SynOSDbContext>(),
        provider.GetRequiredService<IMapper>(),
        provider.GetRequiredService<IReportPdfRenderer>(),
        provider.GetRequiredService<IReportTemplateService>(),
        provider.GetRequiredService<IUserService>(),
        provider.GetRequiredService<IFileStorageService>()
    )); // Register new service
builder.Services.AddScoped<IPacsService, PacsService>();
builder.Services.AddScoped<IRadiologyAccessGuard, RadiologyAccessGuard>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAccessionService, AccessionService>();
builder.Services.AddScoped<ILabAnalyzerService, LabAnalyzerService>(); // New Lab Analyzer Service
builder.Services.AddScoped<IAnalyzerResultMatcherService, AnalyzerResultMatcherService>(); // New Analyzer Result Matcher Service
builder.Services.AddSingleton<IFileStorageService, LocalStorageService>();

// Configure settings
builder.Services.Configure<PacsSettings>(builder.Configuration.GetSection("Pacs"));

// Register Delivery Module Services
builder.Services.AddScoped<IDeliveryService, DeliveryService>();
builder.Services.AddScoped<IWhatsAppSender, StubWhatsAppSender>();
builder.Services.AddScoped<ISmsSender, StubSmsSender>();
builder.Services.AddScoped<IEmailSender, StubEmailSender>();
builder.Services.AddScoped<IPrintService, StubPrintService>();

builder.Services.AddHostedService<NotificationWorkerService>();
builder.Services.AddHostedService<ExpiredLockCleanupService>();

// Add SignalR
builder.Services.AddSignalR();

// Add HttpClientFactory
builder.Services.AddHttpClient();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173") // Frontend URL
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials(); // Required for SignalR
        });
});

var app = builder.Build();

// Seed the database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<SynOSDbContext>();
        DbInitializer.Initialize(context);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

// ✅ Always enable Swagger (for now, this is fine for dev/testing)
app.UseSwagger();
app.UseSwaggerUI();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // Dev-only middleware to bypass auth via header
    app.UseMiddleware<DevHeaderAuthenticationMiddleware>();

    // Dev-only endpoint to generate a JWT for testing
    app.MapPost("/dev-login", (string? userId, string? name, string? roles) =>
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId ?? "6cc795ac-c3c1-4a49-b110-a2da5e2a2fc2"),
            new(ClaimTypes.Name, name ?? "Dev User"),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var roleList = roles?.Split(',', StringSplitOptions.RemoveEmptyEntries) ?? ["Admin", "PathTech", "Reception"];
        foreach (var role in roleList)
        {
            claims.Add(new Claim(ClaimTypes.Role, role.Trim()));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256));

        var tokenHandler = new JwtSecurityTokenHandler();
        return Results.Ok(new { token = tokenHandler.WriteToken(token) });
    })
    .WithTags("Development")
    .AllowAnonymous();
}

app.UseHttpsRedirection();

// Configure static files
var fileStorageBasePath = app.Configuration["FileStorage:BasePath"];
if (!string.IsNullOrEmpty(fileStorageBasePath) && Directory.Exists(fileStorageBasePath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(fileStorageBasePath),
        RequestPath = "/files" // This must match the PublicBaseUrl path segment
    });
}


// Add ErrorHandlerMiddleware
app.UseMiddleware<ErrorHandlerMiddleware>();

app.UseCors("AllowFrontend"); // Use the CORS policy

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<SynOS.Api.Hubs.SampleHub>("/sampleHub"); // Map SampleHub

app.Run();
