using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Infrastructure;
using TBZ.Middleware.Workers;

var builder = Host.CreateApplicationBuilder(args);

// Register MiddlewareDbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=../TBZ.Middleware.Api/MiddlewareDb.db";
builder.Services.AddDbContext<MiddlewareDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddHostedService<WhatsappDeliveryWorker>();
builder.Services.AddHostedService<DailyOperationsProjectionWorker>();
builder.Services.AddHostedService<TestVolumeProjectionWorker>();
builder.Services.AddHostedService<WorkflowProjectionWorker>();
builder.Services.AddHostedService<DeliveryProjectionWorker>();

var host = builder.Build();
host.Run();
