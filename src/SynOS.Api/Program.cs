// File: src/SynOS.Api/Program.cs
// Author: Gemini
// Date: 2025-11-13

using Microsoft.EntityFrameworkCore;
using Serilog;
using Microsoft.AspNetCore.Http.Features;
using SynOS.Data;
using SynOS.Services;
using SynOS.Models.Events;
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
using SynOS.Services.HRMS.Interpretation;
using SynOS.Services.HRMS;
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
using SynOS.Services.Time; // ADDED

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseWindowsService();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(connectionString))
{
    ((IConfigurationBuilder)builder.Configuration).Add(new SynOS.Services.Security.DbConfigurationSource(connectionString, builder.Environment.IsDevelopment()));
}

// Production Secret Validation & Cryptographic Key check
var isDevelopment = builder.Environment.IsDevelopment();

var isConfigured = false;
if (!string.IsNullOrEmpty(connectionString) && !connectionString.Contains("YOUR_SERVER"))
{
    try
    {
        var optionsBuilder = new DbContextOptionsBuilder<SynOS.Data.SynOSDbContext>();
        optionsBuilder.UseSqlServer(connectionString);
        using var context = new SynOS.Data.SynOSDbContext(optionsBuilder.Options);
        if (context.Database.CanConnect() && context.LabProfiles.Any())
        {
            isConfigured = true;
        }
    }
    catch
    {
        // Not configured or migrated yet
    }
}

if (isConfigured)
{
    var jwtSecret = builder.Configuration["Jwt:Secret"];
    if (string.IsNullOrWhiteSpace(jwtSecret))
    {
        throw new System.Security.Cryptography.CryptographicException("CRITICAL CONFIGURATION ERROR: JWT Secret is missing in configuration.");
    }

    var middlewareApiKey = builder.Configuration["Middleware:ApiKey"];
    if (string.IsNullOrWhiteSpace(middlewareApiKey))
    {
        throw new System.Security.Cryptography.CryptographicException("CRITICAL CONFIGURATION ERROR: Middleware API Key is missing in configuration.");
    }

    var backupKey = builder.Configuration["Backup:EncryptionKey"];
    if (string.IsNullOrWhiteSpace(backupKey))
    {
        throw new System.Security.Cryptography.CryptographicException("CRITICAL CONFIGURATION ERROR: Backup encryption key is missing in configuration.");
    }

    var diagnosticsKey = builder.Configuration["Diagnostics:EncryptionKey"];
    if (string.IsNullOrWhiteSpace(diagnosticsKey))
    {
        throw new System.Security.Cryptography.CryptographicException("CRITICAL CONFIGURATION ERROR: Diagnostics encryption key is missing in configuration.");
    }

    if (!isDevelopment)
    {
        if (jwtSecret == "REPLACE_THIS_WITH_A_REAL_SECRET_REPLACE_THIS_WITH_A_REAL_SECRET" || jwtSecret.Contains("REPLACE_THIS_WITH_A_REAL_SECRET"))
        {
            throw new InvalidOperationException("Production Secret Validation Failed: JWT Secret is using default/placeholder value in non-Development environment.");
        }
        if (middlewareApiKey == "TBZ-LAB-KEY-12345")
        {
            throw new InvalidOperationException("Production Secret Validation Failed: Middleware API Key is using default/placeholder value in non-Development environment.");
        }
        if (backupKey == "TBZ-BACKUP-KEY-12345-67890" || backupKey.Contains("TBZ-BACKUP-KEY"))
        {
            throw new InvalidOperationException("Production Secret Validation Failed: Backup Encryption Key is using default/placeholder value in non-Development environment.");
        }
        if (diagnosticsKey == "TBZ-DIAGNOSTICS-KEY-12345-67890" || diagnosticsKey.Contains("TBZ-DIAGNOSTICS-KEY"))
        {
            throw new InvalidOperationException("Production Secret Validation Failed: Diagnostics Encryption Key is using default/placeholder value in non-Development environment.");
        }
    }
}

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 524288000; // 500 MB
});

if (args.Contains("--check-db"))
{
    var connStr = builder.Configuration.GetConnectionString("DefaultConnection");
    Console.WriteLine($"DefaultConnection: {connStr}");
    using (var conn = new Microsoft.Data.SqlClient.SqlConnection(connStr))
    {
        conn.Open();
        Console.WriteLine("Connection opened successfully.");

        using (var cmd = new Microsoft.Data.SqlClient.SqlCommand(@"
            SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            ORDER BY TABLE_NAME, COLUMN_NAME", conn))
        using (var reader = cmd.ExecuteReader())
        {
            Console.WriteLine("\n--- DATABASE SCHEMA DUMP ---");
            while (reader.Read())
            {
                Console.WriteLine($"{reader["TABLE_SCHEMA"]}.{reader["TABLE_NAME"]} | {reader["COLUMN_NAME"]} | {reader["DATA_TYPE"]}({reader["CHARACTER_MAXIMUM_LENGTH"]}) | Nullable: {reader["IS_NULLABLE"]}");
            }
            Console.WriteLine("--- SCHEMA DUMP COMPLETE ---");
        }
    }
    return;
}

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/synos-api-.txt", rollingInterval: RollingInterval.Day) // Stub for file sink
    .CreateLogger();
builder.Host.UseSerilog();

// Add services to the container.
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 524288000; // 500 MB
});
builder.Services.AddHttpContextAccessor(); // ADDED
builder.Services.AddScoped<IUserContext, UserContext>(); // ADDED

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.MaxDepth = 256;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
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
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
           .AddInterceptors(new SynOS.Services.Reporting.TemplateQueryInterceptor());

    if (isDevelopment)
    {
        options.EnableSensitiveDataLogging()
               .EnableDetailedErrors();
    }
});

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
                 path.StartsWithSegments("/branchOperationsHub") ||
                 path.StartsWithSegments("/collaborationHub") ||
                 path.StartsWithSegments("/radiologyCollaborationHub")))
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
    options.AddPolicy("ReportingPolicy", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole("Pathologist") || 
            context.User.IsInRole("Typist") || 
            context.User.IsInRole("DeliveryDesk") || 
            context.User.IsInRole("Admin")));
    options.AddPolicy("LabProcessingPolicy", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole("Technician") ||
            context.User.IsInRole("LabTech") ||
            context.User.IsInRole("Admin")));
});

// Add AutoMapper
builder.Services.AddAutoMapper(typeof(Program)); // Scans for profiles in the assembly

// Register application services
builder.Services.AddScoped<IMiddlewareOutboxService, MiddlewareOutboxService>();
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
builder.Services.AddHrmsOperations(); // ADDED
builder.Services.AddHrmsIntelligenceWiring(); // ADDED
builder.Services.AddOperationalServices(); // ADDED
builder.Services.AddAssignmentServices(); // ADDED
builder.Services.AddScoped<ILabTimeProvider, LabTimeProvider>(); // ADDED
builder.Services.AddScoped<IVisitLifecyclePolicy, VisitLifecyclePolicy>(); // ADDED

// Register Payroll services
builder.Services.AddScoped<SynOS.Services.Payroll.Orchestration.IPayrollWorkflowService, SynOS.Services.Payroll.Orchestration.PayrollWorkflowService>();
builder.Services.AddScoped<SynOS.Services.Payroll.Calculation.IPayrollCalculationLogic, SynOS.Services.Payroll.Calculation.PayrollCalculationLogicStub>();
builder.Services.AddScoped<SynOS.Services.Payroll.Facts.IPayrollFactWriter, SynOS.Services.Payroll.Facts.PayrollFactWriter>();
builder.Services.AddScoped<SynOS.Services.Payroll.Settlement.IPayrollSettlementService, SynOS.Services.Payroll.Settlement.PayrollSettlementService>();

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
        provider.GetRequiredService<INotifier>(), // ADDED
        provider.GetRequiredService<IVisitLifecyclePolicy>(), // ADDED
        provider.GetRequiredService<ILabTimeProvider>(), // ADDED
        provider.GetRequiredService<IRevenueEngine>() // ADDED
    ));
builder.Services.AddScoped<IResultService, ResultService>();
builder.Services.AddScoped<IPhlebotomyService, PhlebotomyService>();
builder.Services.AddScoped<IAccessionNumberGenerator, AccessionNumberGenerator>();
builder.Services.AddScoped<IBranchTimeProvider, BranchTimeProvider>();
builder.Services.AddScoped<IProcessingService, ProcessingService>();
builder.Services.AddScoped<SynOS.Services.Reception.IReceptionSnapshotService, SynOS.Services.Reception.ReceptionSnapshotService>();
builder.Services.AddScoped<SynOS.Services.Reception.IReceptionPatientService, SynOS.Services.Reception.ReceptionPatientService>(); // ADDED
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IDiagnosticsService, DiagnosticsService>();
builder.Services.AddSingleton<ITrustedKeyStore, TrustedKeyStore>();
builder.Services.AddScoped<IUpdateService, UpdateService>();
builder.Services.AddScoped<IBackupService, BackupService>();
builder.Services.AddSingleton<IRestoreStateCoordinator, RestoreStateCoordinator>();
builder.Services.AddScoped<ISupportService, SupportService>();
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
        provider.GetRequiredService<IOperationalEventWriter>(), // ADDED
        provider.GetRequiredService<IConfiguration>(),
        provider.GetRequiredService<IRadiologyImageSourceService>()
    ));
builder.Services.AddScoped<IRadiologyImageSourceService, RadiologyImageSourceService>();
builder.Services.AddScoped<IDictationSessionService, DictationSessionService>();
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
builder.Services.AddHostedService<MiddlewareSyncWorker>();
builder.Services.AddHostedService<DraftVisitCleanupService>();

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
            policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
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

// Run DB Suffix Cleanup unconditionally
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<SynOSDbContext>();
        context.Database.ExecuteSqlRaw("UPDATE Patients SET LastName = '' WHERE LastName = 'Patient';");
        Log.Information("Mononym database cleanup executed successfully.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Failed to run mononym database cleanup on startup.");
    }
}

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
app.UseStaticFiles();

// Configure static files
var fileStorageBasePath = app.Configuration["FileStorage:BasePath"];
if (!string.IsNullOrEmpty(fileStorageBasePath))
{
    if (!Directory.Exists(fileStorageBasePath))
    {
        Directory.CreateDirectory(fileStorageBasePath);
    }
    var provider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
    provider.Mappings[".dcm"] = "application/dicom";
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(fileStorageBasePath),
        RequestPath = "/files",
        ContentTypeProvider = provider,
        OnPrepareResponse = ctx =>
        {
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Headers", "*");
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Methods", "*");
        }
    });
}

app.UseMiddleware<ErrorHandlerMiddleware>();

app.UseCors("AllowFrontend");

// Security Headers Middleware
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Permissions-Policy"] = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none';";
    await next();
});

app.UseAuthentication();
app.UseMiddleware<SessionValidationMiddleware>();
app.UseAuthorization();

app.MapControllers();
// app.MapHub<SynOS.Api.Hubs.SampleHub>("/sampleHub"); // DISABLED TEMPORARILY
app.MapHub<SynOS.Api.Hubs.DashboardHub>("/dashboardHub"); // RESTORED
app.MapHub<SynOS.Api.Hubs.BranchOperationsHub>("/branchOperationsHub");
app.MapHub<SynOS.Api.Hubs.CollaborationHub>("/collaborationHub");
app.MapHub<SynOS.Api.Hubs.CollaborationHub>("/radiologyCollaborationHub");

// Validate Branch Configuration
var isMigrationTool = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Name?.Equals("ef", StringComparison.OrdinalIgnoreCase) ?? false;
if (!isMigrationTool)
{
    using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
    context.Database.Migrate();
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
    }

    // Run Startup Update Verification Check
    var updatesDir = System.IO.Path.Combine(AppContext.BaseDirectory, "updates");
    if (System.IO.Directory.Exists(updatesDir))
    {
        foreach (var versionDir in System.IO.Directory.GetDirectories(updatesDir))
        {
            var stateFile = System.IO.Path.Combine(versionDir, "update_state.json");
            if (System.IO.File.Exists(stateFile))
            {
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
                var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

                logger.LogInformation("Found active update transaction state file in {Path}", versionDir);
                Guid deploymentId = Guid.Empty;
                Guid backupId = Guid.Empty;
                string backupFilePath = "";
                try
                {
                    var stateText = await System.IO.File.ReadAllTextAsync(stateFile);
                    using var stateDoc = System.Text.Json.JsonDocument.Parse(stateText);
                    var root = stateDoc.RootElement;
                    deploymentId = Guid.Parse(root.GetProperty("DeploymentId").GetString() ?? Guid.Empty.ToString());
                    backupId = Guid.Parse(root.GetProperty("BackupId").GetString() ?? Guid.Empty.ToString());
                    backupFilePath = root.GetProperty("BackupFilePath").GetString() ?? "";

                    logger.LogInformation("Processing startup migration check for deployment: {DeploymentId}", deploymentId);

                    // 1. Run migrations
                    logger.LogInformation("Running database migrations...");
                    await context.Database.MigrateAsync();

                    // 2. Run post-migration health checks
                    logger.LogInformation("Running database connection health check...");
                    var healthy = await context.Database.CanConnectAsync();
                    if (!healthy)
                    {
                        throw new Exception("Unable to connect to database after migration.");
                    }

                    // 3. Report Healthy to Middleware
                    logger.LogInformation("Post-migration health check passed. Reporting Healthy to Middleware...");
                    using (var client = new System.Net.Http.HttpClient())
                    {
                        var apiUrl = configuration["Middleware:ApiUrl"] ?? "http://localhost:5069/api/events";
                        var baseUrl = apiUrl.Replace("/api/events", "");
                        var requestUrl = $"{baseUrl}/api/controltower/deployments/events";
                        var payload = new { DeploymentId = deploymentId, EventType = "Healthy" };
                        var content = new System.Net.Http.StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
                        await client.PostAsync(requestUrl, content);
                    }

                    System.IO.File.Delete(stateFile);
                    logger.LogInformation("Update transaction completed successfully.");
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Startup update check failed. Triggering automatic rollback...");
                    try
                    {
                        using (var client = new System.Net.Http.HttpClient())
                        {
                            var apiUrl = configuration["Middleware:ApiUrl"] ?? "http://localhost:5069/api/events";
                            var baseUrl = apiUrl.Replace("/api/events", "");
                            var requestUrl = $"{baseUrl}/api/controltower/deployments/events";
                            
                            if (deploymentId != Guid.Empty)
                            {
                                var payloadRollback = new { DeploymentId = deploymentId, EventType = "RolledBack" };
                                await client.PostAsync(requestUrl, new System.Net.Http.StringContent(System.Text.Json.JsonSerializer.Serialize(payloadRollback), System.Text.Encoding.UTF8, "application/json"));

                                var payloadFailed = new { DeploymentId = deploymentId, EventType = "Failed", PayloadJson = $"{{\"error\":\"{ex.Message}\"}}" };
                                await client.PostAsync(requestUrl, new System.Net.Http.StringContent(System.Text.Json.JsonSerializer.Serialize(payloadFailed), System.Text.Encoding.UTF8, "application/json"));
                            }
                        }

                        // Shutdown and run updater in rollback mode
                        var targetDir = AppContext.BaseDirectory;
                        var backupDir = System.IO.Path.Combine(targetDir, "backup");
                        var currentProcess = System.Diagnostics.Process.GetCurrentProcess();
                        var updaterExePath = System.IO.Path.Combine(targetDir, "SynOS.Updater.exe");
                        if (!System.IO.File.Exists(updaterExePath))
                        {
                            updaterExePath = System.IO.Path.Combine(targetDir, "..", "SynOS.Updater", "bin", "Debug", "net8.0", "SynOS.Updater.exe");
                        }
                        
                        var launchPath = System.IO.Path.Combine(targetDir, "SynOS.Api.exe");
                        if (!System.IO.File.Exists(launchPath)) launchPath = System.IO.Path.Combine(targetDir, "SynOS.Api.dll");

                        var updaterArgs = $"--action rollback --target-dir \"{targetDir}\" --backup-dir \"{backupDir}\" --process-id {currentProcess.Id} --launch-path \"{launchPath}\"";
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                        {
                            FileName = updaterExePath,
                            Arguments = updaterArgs,
                            UseShellExecute = true
                        });

                        // Restore DB backup using BackupService
                        var backupService = scope.ServiceProvider.GetRequiredService<IBackupService>();
                        if (backupId != Guid.Empty && System.IO.File.Exists(backupFilePath))
                        {
                            await backupService.ExecuteRestoreAsync(backupId, backupFilePath, Guid.Empty);
                        }

                        System.IO.File.Delete(stateFile);
                        Environment.Exit(1);
                    }
                    catch (Exception rollEx)
                    {
                        logger.LogCritical(rollEx, "CRITICAL: Automated database/binary rollback failed!");
                    }
                }
            }
        }
    }
}
}

app.MapFallbackToFile("index.html");
app.Run();
