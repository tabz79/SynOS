using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Infrastructure;
using TBZ.Middleware.Workers;
using TBZ.Middleware.Application;
using TBZ.Middleware.Application.Interfaces;

var builder = Host.CreateApplicationBuilder(args);

// Register MiddlewareDbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=../TBZ.Middleware.Api/MiddlewareDb.db";
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
