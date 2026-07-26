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

System.IO.Directory.SetCurrentDirectory(System.AppContext.BaseDirectory);
var builder = WebApplication.CreateBuilder(args);
builder.Host.UseWindowsService();

var isSetupMode = args.Contains("--setup");
if (isSetupMode)
{
    builder.WebHost.UseUrls($"http://*:{SynOS.Api.Services.SystemSetupState.SetupPort}");
}
else
{
    builder.WebHost.UseUrls($"http://*:{SynOS.Api.Services.SystemSetupState.ServicePort}");
}

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    try
    {
        var appSettingsPath = System.IO.Path.Combine(System.AppContext.BaseDirectory, "appsettings.json");
        if (System.IO.File.Exists(appSettingsPath))
        {
            var jsonText = System.IO.File.ReadAllText(appSettingsPath);
            using var doc = System.Text.Json.JsonDocument.Parse(jsonText);
            if (doc.RootElement.TryGetProperty("ConnectionStrings", out var connSection) &&
                connSection.TryGetProperty("DefaultConnection", out var connProp))
            {
                connectionString = connProp.GetString();
            }
        }
    }
    catch {}
}

if (!string.IsNullOrEmpty(connectionString))
{
    ((IConfigurationBuilder)builder.Configuration).Add(new SynOS.Services.Security.DbConfigurationSource(connectionString, builder.Environment.IsDevelopment()));
}

// Production Secret Validation & Cryptographic Key check
var isDevelopment = builder.Environment.IsDevelopment();

var isConfigured = false;
if (!isSetupMode && !string.IsNullOrEmpty(connectionString) && !connectionString.Contains("YOUR_SERVER"))
{
    try
    {
        var optionsBuilder = new DbContextOptionsBuilder<SynOS.Data.SynOSDbContext>();
        optionsBuilder.UseSqlServer(connectionString);
        using var context = new SynOS.Data.SynOSDbContext(optionsBuilder.Options);
        if (context.Database.CanConnect())
        {
            var conn = context.Database.GetDbConnection();
            var wasClosed = conn.State == System.Data.ConnectionState.Closed;
            if (wasClosed) conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM sys.tables WHERE name = 'LabProfiles'";
            var count = Convert.ToInt32(cmd.ExecuteScalar());
            if (wasClosed) conn.Close();
            
            if (count > 0)
            {
                isConfigured = true;
            }
        }
    }
    catch
    {
        // Not configured or migrated yet
    }
}

SynOS.Api.Services.SystemSetupState.IsConfigured = isConfigured;

if (!isSetupMode && !isConfigured)
{
    Console.WriteLine("CRITICAL: SynOS is not configured. Service mode requires a completed configuration. Terminating service immediately.");
    System.Environment.Exit(1);
}

if (isConfigured)
{
    var jwtSecret = builder.Configuration["Jwt:Secret"];
    if (string.IsNullOrWhiteSpace(jwtSecret))
    {
        throw new System.Security.Cryptography.CryptographicException("CRITICAL CONFIGURATION ERROR: JWT Secret is missing in configuration.");
    }

    var middlewareApiKey = builder.Configuration["Middleware:ApiKey"];
    var diagnosticsKey = builder.Configuration["Diagnostics:EncryptionKey"];

    if (!isDevelopment)
    {
        if (jwtSecret == "REPLACE_THIS_WITH_A_REAL_SECRET_REPLACE_THIS_WITH_A_REAL_SECRET" || jwtSecret.Contains("REPLACE_THIS_WITH_A_REAL_SECRET"))
        {
            throw new InvalidOperationException("Production Secret Validation Failed: JWT Secret is using default/placeholder value in non-Development environment.");
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
var logDir = AppContext.BaseDirectory.Contains("Program Files", StringComparison.OrdinalIgnoreCase) 
    ? "C:\\SynOS_Files\\Logs" 
    : Path.Combine(AppContext.BaseDirectory, "Logs");
Directory.CreateDirectory(logDir);
var logFileName = isSetupMode ? "synos-setup-.txt" : "synos-api-.txt";
var logPath = Path.Combine(logDir, logFileName);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(logPath, rollingInterval: RollingInterval.Day)
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
    options.UseSqlServer(connectionString)
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
builder.Services.AddSingleton<SynOS.Services.Security.ILicenseRecoveryService, SynOS.Services.Security.LicenseRecoveryService>();
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
builder.Services.AddSingleton<IBackupKeyProvider, WindowsBackupKeyProvider>();
builder.Services.AddScoped<IBackupService, BackupService>();
builder.Services.AddScoped<SynOS.Services.Inventory.IImsConsumptionService, SynOS.Services.Inventory.ImsConsumptionService>();
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
        provider.GetRequiredService<IRadiologyImageSourceService>(),
        provider.GetRequiredService<IReportService>()
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

if (!isSetupMode || isConfigured)
{
    builder.Services.AddHostedService<NotificationWorkerService>();
    // builder.Services.AddHostedService<ExpiredLockCleanupService>();
    // builder.Services.AddHostedService<AnalyzerTcpListenerService>();
    builder.Services.AddHostedService<OperationalStatsProjectionWorker>();
    builder.Services.AddHostedService<MiddlewareSyncWorker>();
    builder.Services.AddHostedService<DraftVisitCleanupService>();
}

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
            policy.SetIsOriginAllowed(origin => true)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// Register Operations CLI Dispatcher and Commands
builder.Services.AddScoped<SynOS.Services.ProductionDatabasePreparer>();
builder.Services.AddScoped<SynOS.Api.Operations.IOperationsCommand, SynOS.Api.Operations.PrepareDbCommand>();
builder.Services.AddScoped<SynOS.Api.Operations.OperationsDispatcher>();

// DEV-ONLY: Workflow Simulator Wiring
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddScoped<SynOS.Services.Dev.ISimulatedUserScopeFactory, SynOS.Services.Dev.SimulatedUserScopeFactory>();
    builder.Services.AddScoped<SynOS.Services.Dev.IDevWorkflowSimulator, SynOS.Services.Dev.DevWorkflowSimulator>();
}

var app = builder.Build();

// Wire Operations CLI Command Dispatcher
using (var scope = app.Services.CreateScope())
{
    var dispatcher = scope.ServiceProvider.GetRequiredService<SynOS.Api.Operations.OperationsDispatcher>();
    if (await dispatcher.DispatchAsync(args))
    {
        return; // CLI Command handled, exit.
    }
}

if (!isSetupMode)
{
    // Seed the database synchronously ONLY if explicitly requested via CLI seed command
    if (args.Contains("seed"))
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
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' http: https: ws: wss:; frame-ancestors 'none';";
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

// Validate Branch Configuration and run DB/Seeding in background thread
var appLifetime = app.Services.GetRequiredService<IHostApplicationLifetime>();
appLifetime.ApplicationStarted.Register(() =>
{
    if (isSetupMode)
    {
        try
        {
            var url = $"http://localhost:{SynOS.Api.Services.SystemSetupState.SetupPort}/setup";
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(url) { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to automatically open browser: {ex.Message}");
        }
    }
    else
    {
        // Run database migration, seeding, and update checks in a background thread to prevent Windows Service startup timeouts!
        Task.Run(async () =>
        {
            try
            {
                using (var scope = app.Services.CreateScope())
                {
                    var services = scope.ServiceProvider;
                    
                    // 1. Run DB Suffix Cleanup
                    try
                    {
                        var context = services.GetRequiredService<SynOSDbContext>();
                        await context.Database.ExecuteSqlRawAsync("UPDATE Patients SET LastName = '' WHERE LastName = 'Patient';");
                        Log.Information("Mononym database cleanup executed successfully.");
                    }
                    catch (Exception ex)
                    {
                        Log.Warning(ex, "Failed to run mononym database cleanup on startup.");
                    }

                    // 2. Run migrations, seed, validation
                    var isMigrationTool = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Name?.Equals("ef", StringComparison.OrdinalIgnoreCase) ?? false;
                    var shouldMigrate = isConfigured || (!string.IsNullOrEmpty(connectionString) && !connectionString.Contains("YOUR_SERVER"));
                    if (!isMigrationTool && shouldMigrate)
                    {
                        var context = services.GetRequiredService<SynOSDbContext>();
                        Log.Information("Running database migrations in background...");
                        await context.Database.MigrateAsync();
                        DbInitializer.EnsureTablesAndColumnsCreated(context);
                        DbInitializer.Initialize(context);

                        var misconfiguredBranches = context.Branches
                            .Where(b => string.IsNullOrEmpty(b.Code))
                            .ToList();

                        if (misconfiguredBranches.Any())
                        {
                            var logger = services.GetRequiredService<ILogger<Program>>();
                            foreach (var branch in misconfiguredBranches)
                            {
                                logger.LogCritical("Startup Validation Failed: Branch '{BranchName}' (ID: {BranchId}) is missing Code.", branch.Name, branch.BranchId);
                            }
                        }

                        // 3. Run Startup Update Verification Check
                        var updatesDir = System.IO.Path.Combine(AppContext.BaseDirectory, "updates");
                        if (System.IO.Directory.Exists(updatesDir))
                        {
                            foreach (var versionDir in System.IO.Directory.GetDirectories(updatesDir))
                            {
                                var stateFile = System.IO.Path.Combine(versionDir, "update_state.json");
                                if (System.IO.File.Exists(stateFile))
                                {
                                    var logger = services.GetRequiredService<ILogger<Program>>();
                                    var configuration = services.GetRequiredService<IConfiguration>();

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

                                        // Run migrations
                                        logger.LogInformation("Running database migrations for update...");
                                        await context.Database.MigrateAsync();

                                        // Run post-migration health checks
                                        logger.LogInformation("Running database connection health check for update...");
                                        var healthy = await context.Database.CanConnectAsync();
                                        if (!healthy)
                                        {
                                            throw new Exception("Unable to connect to database after migration.");
                                        }

                                        // Report Healthy to Middleware
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
            }
            catch (Exception ex)
            {
                Log.Fatal(ex, "Background service startup/migration task failed!");
            }
        });
    }
});

app.MapFallbackToFile("index.html");
app.Run();
