using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Infrastructure;
using TBZ.Middleware.Workers;
using TBZ.Middleware.Application;
using TBZ.Middleware.Application.Interfaces;

var builder = Host.CreateApplicationBuilder(args);

// Register MiddlewareDbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    var currentDir = new DirectoryInfo(AppContext.BaseDirectory);
    string? resolvedDbPath = null;
    while (currentDir != null)
    {
        var synosSln = Path.Combine(currentDir.FullName, "SynOS.sln");
        if (File.Exists(synosSln))
        {
            resolvedDbPath = Path.Combine(currentDir.FullName, "TBZ.Middleware", "src", "TBZ.Middleware.Api", "MiddlewareDb.db");
            break;
        }
        var tbzSln = Path.Combine(currentDir.FullName, "TBZ.Middleware.sln");
        if (File.Exists(tbzSln))
        {
            resolvedDbPath = Path.Combine(currentDir.FullName, "src", "TBZ.Middleware.Api", "MiddlewareDb.db");
            break;
        }
        currentDir = currentDir.Parent;
    }
    
    var finalDbPath = resolvedDbPath ?? Path.Combine(AppContext.BaseDirectory, "MiddlewareDb.db");
    connectionString = $"Data Source={finalDbPath}";
}

var sqliteBuilder = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(connectionString);
var absoluteDbPath = Path.GetFullPath(sqliteBuilder.DataSource);
Console.WriteLine($"[DATABASE AUDIT] Worker SQLite Database absolute path: {absoluteDbPath}");

builder.Services.AddDbContext<MiddlewareDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddScoped<INotificationDbContext>(sp => sp.GetRequiredService<MiddlewareDbContext>());
builder.Services.AddNotificationEngine(builder.Configuration);

builder.Services.AddHostedService<NotificationOutboxWorker>();
builder.Services.AddHostedService<WhatsappDeliveryWorker>();
builder.Services.AddHostedService<DailyOperationsProjectionWorker>();
builder.Services.AddHostedService<TestVolumeProjectionWorker>();
builder.Services.AddHostedService<WorkflowProjectionWorker>();
builder.Services.AddHostedService<DeliveryProjectionWorker>();
builder.Services.AddHostedService<PatientDemographicProjectionWorker>();
builder.Services.AddHostedService<DoctorReferralProjectionWorker>();
builder.Services.AddHostedService<ReferralPartnerProjectionWorker>();
builder.Services.AddHostedService<TrendProjectionWorker>();
builder.Services.AddHostedService<ReferralConversionProjectionWorker>();
builder.Services.AddHostedService<BusinessSourceProjectionWorker>();
builder.Services.AddHostedService<PatientIntelligenceProjectionWorker>();

var host = builder.Build();
host.Run();
