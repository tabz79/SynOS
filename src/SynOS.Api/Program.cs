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
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.OpenApi.Models; // Added for Swagger JWT configuration
using SynOS.Services.Storage;
using SynOS.Services.Stubs;
using SynOS.Services.Revenue;
using SynOS.Services.EconomicsIntelligence; // Add this using // Add this using
using SynOS.Services.CostAttribution; // 🔒 LIVE ENGINE (RESTORED)
using SynOS.Models.Configuration;
using SynOS.Services.Security;
using SynOS.Services.AnalyzerIntegration; // New
using System.Text.Json.Serialization; // Added
using SynOS.Services.Referral; // Added to resolve build error
using SynOS.Services.Interpretation; // ADDED
using SynOS.Services.HR; // ADDED
using SynOS.Services.Governance; // ADDED
using SynOS.Services.Compliance; // ADDED
using SynOS.Services.HRMS.Interpretation; // ADDED
using SynOS.Services.HRMS.IntelligenceWiring; // ADDED
using SynOS.Services.Operational; // ADDED
using SynOS.Services.Assignment; // ADDED
using SynOS.Services.Admin; // ADDED
using SynOS.Services.Dashboard; // ADDED
using SynOS.Services.Operations; // ADDED
using SynOS.Api.Services; // ADDED
using SynOS.Services.Settlements; // ADDED
using SynOS.Services.Phlebotomy; // ADDED
using SynOS.Services.Reporting; // ADDED
using SynOS.Services.Inventory; // ADDED

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
builder.Services.AddHttpContextAccessor(); // ADDED
builder.Services.AddScoped<IUserContext, UserContext>(); // ADDED

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.MaxDepth = 256;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
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

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                (path.StartsWithSegments("/dashboardHub") || 
                 path.StartsWithSegments("/sampleHub") ||
                 path.StartsWithSegments("/branchOperationsHub")))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
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
    options.AddPolicy("TypistPolicy", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole("Typist") || context.User.IsInRole("Admin")));
    options.AddPolicy("DeliveryPolicy", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole("DeliveryDesk") || context.User.IsInRole("Admin")));
    options.AddPolicy("OperationalModeOnly", policy =>
        policy.RequireClaim("session_mode", "operational"));
    options.AddPolicy("ReportingPolicy", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole("Pathologist") || 
            context.User.IsInRole("Typist") || 
            context.User.IsInRole("DeliveryDesk") || 
            context.User.IsInRole("Admin")));
    options.AddPolicy("LabProcessingPolicy", policy =>
        policy.RequireClaim("session_mode", "operational")
              .RequireAssertion(context =>
                  context.User.IsInRole("Technician") ||
                  context.User.IsInRole("LabTech") ||
                  context.User.IsInRole("Admin")));
});

// Add AutoMapper
builder.Services.AddAutoMapper(typeof(Program)); // Scans for profiles in the assembly

// Register application services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAdminUserService, AdminUserService>(); 
builder.Services.AddScoped<IOperationsEngine, OperationsEngine>(); // ADDED
builder.Services.AddScoped<IDashboardService, DashboardService>(); // Auto-wired OK
builder.Services.AddScoped<IControlTowerService, ControlTowerService>();
builder.Services.AddScoped<IDashboardNotificationService, SignalRDashboardNotificationService>(); // ADDED: Phase 2
builder.Services.AddScoped<INotifier, SignalRNotifier>(); // ADDED: Action Queue Refresh
builder.Services.AddSingleton<SynOS.Services.Operational.IOperationalEventChannel, SynOS.Services.Operational.OperationalEventChannel>(); // ADDED: Event-Driven Projection
builder.Services.AddScoped<IPatientService, PatientService>();
builder.Services.AddReferralServices();
builder.Services.AddPayableServices();
builder.Services.AddScoped<ISettlementService, SettlementService>(); // ADDED
builder.Services.AddScoped<IVisitService, VisitService>();
builder.Services.AddScoped<IEditLockService, EditLockService>();
builder.Services.AddScoped<IDiscountService, DiscountService>(); // ADDED
    // REFACTOR: Disabled for Specimen Migration
    /*
    builder.Services.AddScoped<ISampleService, SampleService>(provider =>
        new SampleService(
            provider.GetRequiredService<SynOSDbContext>(),
            provider.GetRequiredService<ISampleNotifier>(),
            provider.GetRequiredService<ITubeConsumptionService>(),
            provider.GetRequiredService<ILogger<SampleService>>(),
            provider.GetRequiredService<IOperationalEventWriter>(),
            provider.GetRequiredService<IUserContext>(),
            provider.GetRequiredService<IOperationsEngine>() // ADDED
        ));
    */
builder.Services.AddScoped<ITubeConsumptionService, TubeConsumptionService>();
builder.Services.AddScoped<IPurchasingService, PurchasingService>();
builder.Services.AddScoped<IIMSWastageInsightService, IMSWastageInsightService>();
builder.Services.AddScoped<IImsRequestService, ImsRequestService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();

// Register Referral Interpretation Service
builder.Services.AddScoped<IReferralInterpretationService, ReferralInterpretationService>(); // ADDED HERE
builder.Services.AddScoped<IDiscountInterpretationService, DiscountInterpretationService>(); // ADDED HERE

// Register Revenue Engine services (OPT-IN)
builder.Services.AddEconomicsIntelligence();
builder.Services.AddSpendEngineServices(); // ADDED
builder.Services.AddRevenueEngine();
builder.Services.AddComplianceServices(); // ADDED
builder.Services.AddGovernanceServices(); // ADDED
builder.Services.AddHrmsInterpretation(); // ADDED
builder.Services.AddHrmsIntelligenceWiring(); // ADDED
builder.Services.AddOperationalServices(); // ADDED
builder.Services.AddAssignmentServices(); // ADDED

// Register Economics Intelligence services (OPT-IN)
// builder.Services.AddEconomicsIntelligence();

// 🔒 Cost Attribution services intentionally NOT registered yet
builder.Services.AddScoped<ICostAttributionPolicyResolver, CostAttributionPolicyResolver>();
builder.Services.AddScoped<ICostAttributionUsageFactWriter, CostAttributionUsageFactWriter>();

builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<ICorrectionService, CorrectionService>(); // ADDED
builder.Services.AddScoped<IReceptionFlowService>(provider =>
    new ReceptionFlowService(
        provider.GetRequiredService<SynOSDbContext>(),
        provider.GetRequiredService<IVisitService>(),
        provider.GetRequiredService<IInvoiceService>(),
        provider.GetRequiredService<IAccessionService>(),
        provider.GetRequiredService<ILogger<ReceptionFlowService>>(),
        provider.GetRequiredService<ITestsCacheService>(),
        provider.GetRequiredService<IConfiguration>(),
        provider.GetRequiredService<IReferralFinancialService>(),
        provider.GetRequiredService<IOperationalEventWriter>(),
        provider.GetRequiredService<IUserContext>(), // ADDED
        provider.GetRequiredService<IWorkRoutingEngine>(), // ADDED
        provider.GetRequiredService<ISpecimenGroupingService>(), // ADDED
        provider.GetRequiredService<IEventPublishingService>(), // ADDED
        provider.GetRequiredService<INotifier>() // ADDED
    ));
builder.Services.AddScoped<IResultService, ResultService>();
builder.Services.AddScoped<IPhlebotomyService, PhlebotomyService>();
builder.Services.AddScoped<IAccessionNumberGenerator, AccessionNumberGenerator>();
builder.Services.AddScoped<IBranchTimeProvider, BranchTimeProvider>();
builder.Services.AddScoped<IProcessingService, ProcessingService>();
builder.Services.AddScoped<SynOS.Services.Reception.IReceptionSnapshotService, SynOS.Services.Reception.ReceptionSnapshotService>();
builder.Services.AddScoped<SynOS.Services.Reception.IReceptionPatientService, SynOS.Services.Reception.ReceptionPatientService>(); // ADDED
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IReportingService, ReportingService>(); // New Reporting Engine
builder.Services.AddScoped<IInterpretationService, InterpretationService>(); // ADDED
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
        provider.GetRequiredService<IFileStorageService>(),
        provider.GetRequiredService<IOperationalEventWriter>() // ADDED
    ));
builder.Services.AddScoped<IPacsService, PacsService>();
builder.Services.AddScoped<IRadiologyAccessGuard, RadiologyAccessGuard>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAccessionService, AccessionService>();
builder.Services.AddScoped<ISpecimenGroupingService, SpecimenGroupingService>(); // ADDED
builder.Services.AddScoped<IEmployeeAdminService, EmployeeAdminService>(); // ADDED
builder.Services.AddScoped<ILabAnalyzerService, LabAnalyzerService>();
builder.Services.AddScoped<IAnalyzerResultMatcherService, AnalyzerResultMatcherService>();
builder.Services.AddScoped<IAnalyzerResultImportService, AnalyzerResultImportService>();
builder.Services.AddScoped<ITestMasterService, TestMasterService>();
builder.Services.AddScoped<IAuditService, AuditService>(provider =>
    new AuditService(
        provider.GetRequiredService<SynOSDbContext>(),
        provider.GetRequiredService<ILogger<AuditService>>()
    ));
builder.Services.AddScoped<ICsvService, CsvService>();
builder.Services.AddScoped<ICatalogImportService, CatalogImportService>();
builder.Services.AddScoped<ICatalogProvisioningService, CatalogProvisioningService>();
builder.Services.AddScoped<ICatalogManagementService, CatalogManagementService>();
builder.Services.AddScoped<ITestsCacheService, TestsCacheService>();
builder.Services.AddSingleton<IFileStorageService, LocalStorageService>();
builder.Services.AddMemoryCache();

// Register AnalyzerIntegration services
builder.Services.AddTransient<AstmProtocolParser>();
builder.Services.AddTransient<Hl7ProtocolParser>();
builder.Services.AddScoped<IAnalyzerProtocolParserFactory, AnalyzerProtocolParserFactory>();

// Configure settings
builder.Services.Configure<PacsSettings>(builder.Configuration.GetSection("Pacs"));
builder.Services.Configure<AnalyzerIntegrationSettings>(builder.Configuration.GetSection("AnalyzerIntegration"));

// Register Delivery Module Services
builder.Services.AddScoped<IDeliveryService, DeliveryService>();
builder.Services.AddScoped<IWhatsAppSender, StubWhatsAppSender>();
builder.Services.AddScoped<ISmsSender, StubSmsSender>();
builder.Services.AddScoped<IEmailSender, StubEmailSender>();
builder.Services.AddScoped<IPrintService, StubPrintService>();

// Register Domain Event Publishing
builder.Services.AddScoped<IEventPublishingService, SynOS.Api.Services.EventPublishingService>();

builder.Services.AddHostedService<NotificationWorkerService>();
// builder.Services.AddHostedService<ExpiredLockCleanupService>();
// builder.Services.AddHostedService<AnalyzerTcpListenerService>();
builder.Services.AddHostedService<OperationalStatsProjectionWorker>();

// Add SignalR
builder.Services.AddSignalR();
builder.Services.AddSingleton<IHubFilter, SessionValidationHubFilter>();

// Add HttpClientFactory
builder.Services.AddHttpClient();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// DEV-ONLY: Workflow Simulator Wiring
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddScoped<SynOS.Services.Dev.ISimulatedUserScopeFactory, SynOS.Services.Dev.SimulatedUserScopeFactory>();
    builder.Services.AddScoped<SynOS.Services.Dev.IDevWorkflowSimulator, SynOS.Services.Dev.DevWorkflowSimulator>();
}

var app = builder.Build();

// Seed the database
if (args.Contains("seed") || app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        try
        {
            var context = services.GetRequiredService<SynOSDbContext>();
            SynOS.Data.DbInitializer.Initialize(context);
            Log.Information("Database seeding completed successfully.");
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "An error occurred while seeding the database.");
        }
    }

    if (args.Contains("seed"))
    {
        Log.Information("Exiting after seeding because 'seed' argument was provided.");
        return;
    }
}

// Always enable Swagger (dev/testing)
app.UseSwagger();
app.UseSwaggerUI();

if (app.Environment.IsDevelopment())
{
    app.UseMiddleware<DevHeaderAuthenticationMiddleware>();

    app.MapPost("/dev-login", (string? userId, string? name, string? roles) =>
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId ?? "6cc795ac-c3c1-4a49-b110-a2da5e2a2fc2"),
            new(ClaimTypes.Name, name ?? "Dev User"),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var roleList = roles?.Split(',', StringSplitOptions.RemoveEmptyEntries) ?? ["Admin", "PathTech", "Reception", "Typist"];
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
        RequestPath = "/files"
    });
}

app.UseMiddleware<ErrorHandlerMiddleware>();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseMiddleware<SessionValidationMiddleware>();
app.UseAuthorization();

app.MapControllers();
// app.MapHub<SynOS.Api.Hubs.SampleHub>("/sampleHub"); // DISABLED TEMPORARILY
app.MapHub<SynOS.Api.Hubs.DashboardHub>("/dashboardHub"); // RESTORED
app.MapHub<SynOS.Api.Hubs.BranchOperationsHub>("/branchOperationsHub");

// Validate Branch Configuration
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
    DbInitializer.Initialize(context);
    
    var misconfiguredBranches = context.Branches
        .Where(b => string.IsNullOrEmpty(b.Code))
        .ToList();

    if (misconfiguredBranches.Any())
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        foreach (var branch in misconfiguredBranches)
        {
            logger.LogCritical("Startup Validation Failed: Branch '{BranchName}' (ID: {BranchId}) is missing Code.", branch.Name, branch.BranchId);
        }
        // In production, we might want to throw here. For now, we log as Critical.
    }
}

app.Run();
