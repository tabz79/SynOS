using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace SynOS.RemoteBridge.Services
{
    public class UploadTaskItem
    {
        public string FilePath { get; set; } = string.Empty;
        public string StudyUid { get; set; } = string.Empty;
        public string SeriesUid { get; set; } = string.Empty;
        public string SopUid { get; set; } = string.Empty;
        public int RetryCount { get; set; } = 0;
    }

    public class CloudUploadService : BackgroundService
    {
        private readonly ILogger<CloudUploadService> _logger;
        private readonly BridgeLogService _logService;
        private readonly BridgeConfig _config;
        private readonly HttpClient _httpClient;
        private readonly ConcurrentQueue<UploadTaskItem> _uploadQueue = new();

        public CloudUploadService(
            ILogger<CloudUploadService> logger,
            BridgeLogService logService,
            BridgeConfig config)
        {
            _logger = logger;
            _logService = logService;
            _config = config;
            _httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(60)
            };
        }

        public void EnqueueFile(string filePath, string studyUid, string seriesUid, string sopUid)
        {
            _uploadQueue.Enqueue(new UploadTaskItem
            {
                FilePath = filePath,
                StudyUid = studyUid,
                SeriesUid = seriesUid,
                SopUid = sopUid
            });
        }

        public async Task<(bool Success, long LatencyMs, string Message)> TestCloudConnectionAsync()
        {
            var sw = Stopwatch.StartNew();
            try
            {
                var healthUrl = $"{_config.ServerUrl.TrimEnd('/')}/api/v1/radiology/pacs/bridge/health";
                using var request = new HttpRequestMessage(HttpMethod.Get, healthUrl);
                request.Headers.Add("X-Bridge-LabId", _config.LabId);
                request.Headers.Add("X-Bridge-Key", _config.ApiKey);

                var response = await _httpClient.SendAsync(request);
                sw.Stop();

                if (response.IsSuccessStatusCode)
                {
                    _logService.Telemetry.CloudOnline = true;
                    return (true, sw.ElapsedMilliseconds, $"Connected to SynOS Server ({sw.ElapsedMilliseconds}ms). Status: HTTP {(int)response.StatusCode}");
                }
                else
                {
                    // Even if 404 or 401, host is reachable
                    var content = await response.Content.ReadAsStringAsync();
                    return (false, sw.ElapsedMilliseconds, $"Host responded with HTTP {(int)response.StatusCode} {response.ReasonPhrase}: {content}");
                }
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logService.Telemetry.CloudOnline = false;
                _logService.Telemetry.LastCloudError = ex.Message;
                return (false, sw.ElapsedMilliseconds, $"Cannot reach SynOS Cloud ({ex.GetType().Name}): {ex.Message}");
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logService.Log("CLOUD-SYNC", $"Cloud Sync Worker started. Target: {_config.ServerUrl}", "INFO");

            // Recover un-uploaded files from spool on startup
            ScanSpoolOnStartup();

            // Periodic connection health check
            _ = Task.Run(async () =>
            {
                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        var (ok, ms, _) = await TestCloudConnectionAsync();
                        _logService.Telemetry.CloudOnline = ok;
                    }
                    catch { }
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                }
            }, stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                if (_uploadQueue.TryDequeue(out var item))
                {
                    var uploaded = await ProcessUploadItemAsync(item, stoppingToken);
                    if (!uploaded)
                    {
                        // Retry with backoff
                        if (item.RetryCount < 10)
                        {
                            item.RetryCount++;
                            _uploadQueue.Enqueue(item);
                            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                        }
                        else
                        {
                            _logService.Log("CLOUD-SYNC", $"Max retries reached for {Path.GetFileName(item.FilePath)}. Keeping in spool.", "ERROR");
                        }
                    }
                }
                else
                {
                    await Task.Delay(500, stoppingToken);
                }
            }
        }

        private async Task<bool> ProcessUploadItemAsync(UploadTaskItem item, CancellationToken ct)
        {
            if (!File.Exists(item.FilePath))
            {
                return true; // File no longer exists, consider handled
            }

            try
            {
                var ingestUrl = $"{_config.ServerUrl.TrimEnd('/')}/api/v1/radiology/pacs/bridge/ingest";

                using var form = new MultipartFormDataContent();
                await using var fileStream = File.OpenRead(item.FilePath);
                var streamContent = new StreamContent(fileStream);
                streamContent.Headers.ContentType = new MediaTypeHeaderValue("application/dicom");
                form.Add(streamContent, "files", Path.GetFileName(item.FilePath));

                using var request = new HttpRequestMessage(HttpMethod.Post, ingestUrl)
                {
                    Content = form
                };
                request.Headers.Add("X-Bridge-LabId", _config.LabId);
                request.Headers.Add("X-Bridge-Key", _config.ApiKey);

                var response = await _httpClient.SendAsync(request, ct);

                if (response.IsSuccessStatusCode)
                {
                    _logService.Telemetry.CloudUploaded++;
                    if (_logService.Telemetry.SpoolPending > 0) _logService.Telemetry.SpoolPending--;
                    _logService.Telemetry.LastCloudUploadTime = DateTime.Now;
                    _logService.Telemetry.CloudOnline = true;

                    _logService.Log(
                        "CLOUD-SYNC",
                        $"☁️ Transferred to SynOS: {Path.GetFileName(item.FilePath)} ({fileStream.Length / 1024} KB)",
                        "SUCCESS");

                    // Clean up or mark uploaded
                    try
                    {
                        fileStream.Close();
                        File.Delete(item.FilePath);
                    }
                    catch { }

                    return true;
                }
                else
                {
                    _logService.Telemetry.CloudErrors++;
                    var errorDetails = await response.Content.ReadAsStringAsync(ct);
                    _logService.Log(
                        "CLOUD-SYNC",
                        $"⚠️ Cloud Ingestion responded HTTP {(int)response.StatusCode}: {errorDetails}. Spooled for retry.",
                        "WARN");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logService.Telemetry.CloudErrors++;
                _logService.Telemetry.CloudOnline = false;
                _logService.Telemetry.LastCloudError = ex.Message;
                _logService.Log(
                    "CLOUD-SYNC",
                    $"⚠️ Cloud Sync paused: {ex.Message}. File buffered locally in spool.",
                    "WARN");
                return false;
            }
        }

        private void ScanSpoolOnStartup()
        {
            try
            {
                var spoolDir = Path.GetFullPath(_config.SpoolDir);
                if (!Directory.Exists(spoolDir)) return;

                var dcmFiles = Directory.GetFiles(spoolDir, "*.dcm", SearchOption.AllDirectories);
                if (dcmFiles.Length > 0)
                {
                    _logService.Log("SPOOL", $"Found {dcmFiles.Length} existing files in spool. Queueing for cloud forwarding...", "INFO");
                    foreach (var file in dcmFiles)
                    {
                        var parent = Path.GetFileName(Path.GetDirectoryName(file) ?? "");
                        var grandParent = Path.GetFileName(Path.GetDirectoryName(Path.GetDirectoryName(file) ?? "") ?? "");
                        EnqueueFile(file, grandParent, parent, Path.GetFileNameWithoutExtension(file));
                    }
                    _logService.Telemetry.SpoolPending = dcmFiles.Length;
                }
            }
            catch (Exception ex)
            {
                _logService.Log("SPOOL", $"Error scanning spool directory: {ex.Message}", "WARN");
            }
        }
    }
}
