using System;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SynOS.RemoteBridge.Services;

namespace SynOS.RemoteBridge.Controllers
{
    [ApiController]
    [Route("api")]
    public class BridgeApiController : ControllerBase
    {
        private readonly BridgeLogService _logService;
        private readonly BridgeConfig _config;
        private readonly CloudUploadService _cloudUploadService;

        public BridgeApiController(
            BridgeLogService logService,
            BridgeConfig config,
            CloudUploadService cloudUploadService)
        {
            _logService = logService;
            _config = config;
            _cloudUploadService = cloudUploadService;
        }

        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            return Ok(new
            {
                telemetry = _logService.Telemetry,
                config = new
                {
                    _config.ServerUrl,
                    _config.LabId,
                    _config.DicomPort,
                    _config.AeTitle,
                    _config.SpoolDir,
                    _config.AutoForward,
                    _config.ScannerIp,
                    _config.ScannerPort,
                    _config.ScannerAeTitle
                },
                host = new
                {
                    machineName = Environment.MachineName,
                    osVersion = Environment.OSVersion.ToString(),
                    dotnetVersion = Environment.Version.ToString(),
                    uptime = TimeSpan.FromMilliseconds(Environment.TickCount64).ToString(@"d\.hh\:mm\:ss")
                }
            });
        }

        [HttpGet("logs")]
        public IActionResult GetLogs([FromQuery] int count = 100)
        {
            return Ok(_logService.GetRecentLogs(count));
        }

        [HttpGet("logs/stream")]
        public async Task StreamLogs(CancellationToken ct)
        {
            Response.Headers.Append("Content-Type", "text/event-stream");
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("Connection", "keep-alive");

            var reader = _logService.Subscribe();
            try
            {
                // Send recent logs first
                var initialLogs = _logService.GetRecentLogs(30);
                foreach (var log in initialLogs)
                {
                    var data = JsonSerializer.Serialize(log);
                    await Response.WriteAsync($"data: {data}\n\n", ct);
                }
                await Response.Body.FlushAsync(ct);

                // Stream real-time logs
                while (!ct.IsCancellationRequested && await reader.WaitToReadAsync(ct))
                {
                    while (reader.TryRead(out var log))
                    {
                        var data = JsonSerializer.Serialize(log);
                        await Response.WriteAsync($"data: {data}\n\n", ct);
                    }
                    await Response.Body.FlushAsync(ct);
                }
            }
            finally
            {
                _logService.Unsubscribe(reader);
            }
        }

        public class ScannerPingRequest
        {
            public string Ip { get; set; } = string.Empty;
            public int Port { get; set; } = 104;
            public string ScannerAe { get; set; } = "CT_SCANNER";
            public string LocalAe { get; set; } = "SYNOS_BRIDGE";
        }

        [HttpPost("ping-scanner")]
        public async Task<IActionResult> PingScanner([FromBody] ScannerPingRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Ip))
            {
                return BadRequest(new { message = "Scanner IP address is required." });
            }

            _logService.Log("C-ECHO", $"Initiating live DICOM C-ECHO Ping to {req.Ip}:{req.Port} (Target AE: '{req.ScannerAe}', Source AE: '{req.LocalAe}')...", "INFO");

            var result = await BridgeDicomScpService.PingScannerAsync(req.Ip, req.Port, req.ScannerAe, req.LocalAe);

            if (result.Success)
            {
                _logService.Log("C-ECHO", $"✅ {result.Message}", "SUCCESS");
            }
            else
            {
                _logService.Log("C-ECHO", $"❌ {result.Message}", "ERROR");
            }

            return Ok(new
            {
                success = result.Success,
                latencyMs = result.LatencyMs,
                message = result.Message
            });
        }

        [HttpPost("test-cloud")]
        public async Task<IActionResult> TestCloud()
        {
            _logService.Log("CLOUD-SYNC", $"Testing connection to SynOS Server: {_config.ServerUrl}...", "INFO");
            var result = await _cloudUploadService.TestCloudConnectionAsync();

            if (result.Success)
            {
                _logService.Log("CLOUD-SYNC", $"✅ {result.Message}", "SUCCESS");
            }
            else
            {
                _logService.Log("CLOUD-SYNC", $"⚠️ {result.Message}", "WARN");
            }

            return Ok(new
            {
                success = result.Success,
                latencyMs = result.LatencyMs,
                message = result.Message
            });
        }

        [HttpGet("config")]
        public IActionResult GetConfig()
        {
            return Ok(_config);
        }

        [HttpPost("config")]
        public IActionResult SaveConfig([FromBody] BridgeConfig updated)
        {
            if (updated == null) return BadRequest("Invalid config");

            _config.ServerUrl = updated.ServerUrl;
            _config.LabId = updated.LabId;
            _config.ApiKey = updated.ApiKey;
            _config.DicomPort = updated.DicomPort;
            _config.AeTitle = updated.AeTitle;
            _config.SpoolDir = updated.SpoolDir;
            _config.AutoForward = updated.AutoForward;
            _config.ScannerIp = updated.ScannerIp;
            _config.ScannerPort = updated.ScannerPort;
            _config.ScannerAeTitle = updated.ScannerAeTitle;
            _config.Save();

            _logService.Log("SYSTEM", "Configuration updated and saved to bridge-config.json", "SUCCESS");
            return Ok(new { success = true, message = "Configuration saved successfully." });
        }
    }
}
