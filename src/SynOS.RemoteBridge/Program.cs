using System;
using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SynOS.RemoteBridge.Services;

namespace SynOS.RemoteBridge
{
    public class Program
    {
        public static void Main(string[] args)
        {
            Console.WriteLine(@"
================================================================================
  _____             ____   _____         _____                      _       ____       _     _             
 / ____|           / __ \ / ____|       |  __ \                    | |     |  _ \     (_)   | |            
| (___  _   _ _ __| |  | | (___ ______  | |__) |___ _ __ ___   ___ | |_ ___| |_) |_ __ _  __| | __ _  ___  
 \___ \| | | | '_ \ |  | |\___ \______| |  _  // _ \ '_ ` _ \ / _ \| __/ _ \  _ <| '__| |/ _` |/ _` |/ _ \ 
 ____) | |_| | | | | |__| |____) |      | | \ \  __/ | | | | | (_) | ||  __/ |_) | |  | | (_| | (_| |  __/ 
|_____/ \__, |_| |_|\____/|_____/       |_|  \_\___|_| |_| |_|\___/ \__\___|____/|_|  |_|\__,_|\__, |\___| 
         __/ |                                                                                  __/ |      
        |___/                                                                                  |___/       
================================================================================
  SynOS-RemoteBridge | Autonomous DICOM C-STORE / C-ECHO Medical Edge Gateway
================================================================================");

            var builder = WebApplication.CreateBuilder(args);

            // Load Configuration
            var config = BridgeConfig.Load();
            builder.Services.AddSingleton(config);

            // Logging & Telemetry
            builder.Services.AddSingleton<BridgeLogService>();

            // Cloud Forwarder Worker
            builder.Services.AddSingleton<CloudUploadService>();
            builder.Services.AddHostedService(sp => sp.GetRequiredService<CloudUploadService>());

            // DICOM SCP Service
            builder.Services.AddSingleton<BridgeDicomScpService>();
            builder.Services.AddHostedService(sp => sp.GetRequiredService<BridgeDicomScpService>());

            // Controllers
            builder.Services.AddControllers();

            // Configure Kestrel port
            builder.WebHost.ConfigureKestrel(options =>
            {
                options.ListenAnyIP(config.WebPort);
            });

            var app = builder.Build();

            app.UseDefaultFiles();
            app.UseStaticFiles();
            app.UseRouting();
            app.MapControllers();
            app.MapFallbackToFile("index.html");

            Console.WriteLine($"[Web UI] SynOS Remote Bridge Dashboard running at http://localhost:{config.WebPort}");
            Console.WriteLine($"[DICOM] Listening on DICOM Port {config.DicomPort} (AE Title: {config.AeTitle})");
            Console.WriteLine($"[Cloud] Connected target: {config.ServerUrl} (Lab ID: {config.LabId})");
            Console.WriteLine("--------------------------------------------------------------------------------\n");

            app.Run();
        }
    }
}
