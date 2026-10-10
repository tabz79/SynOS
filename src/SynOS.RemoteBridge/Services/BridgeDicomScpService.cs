using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using FellowOakDicom;
using FellowOakDicom.Network;
using FellowOakDicom.Network.Client;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace SynOS.RemoteBridge.Services
{
    public class BridgeDicomScpService : BackgroundService
    {
        private readonly ILogger<BridgeDicomScpService> _logger;
        private readonly BridgeLogService _logService;
        private readonly BridgeConfig _config;
        private readonly CloudUploadService _cloudUploadService;
        private readonly List<IDicomServer> _activeServers = new();

        public static BridgeLogService? SharedLogService { get; private set; }
        public static BridgeConfig? SharedConfig { get; private set; }
        public static CloudUploadService? SharedCloudUploader { get; private set; }

        public BridgeDicomScpService(
            ILogger<BridgeDicomScpService> logger,
            BridgeLogService logService,
            BridgeConfig config,
            CloudUploadService cloudUploadService)
        {
            _logger = logger;
            _logService = logService;
            _config = config;
            _cloudUploadService = cloudUploadService;

            SharedLogService = logService;
            SharedConfig = config;
            SharedCloudUploader = cloudUploadService;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logService.Log("SYSTEM", "Starting SynOS Remote Bridge DICOM Engine...", "INFO");

            // Ensure spool directory exists
            var spoolPath = Path.GetFullPath(_config.SpoolDir);
            if (!Directory.Exists(spoolPath))
            {
                Directory.CreateDirectory(spoolPath);
            }
            _logService.Log("SPOOL", $"Local DICOM Spool initialized at: {spoolPath}", "INFO");

            // Ports to bind
            var portsToBind = new HashSet<int>();
            if (_config.DicomPort > 0) portsToBind.Add(_config.DicomPort);
            if (_config.FallbackPorts != null)
            {
                foreach (var p in _config.FallbackPorts)
                {
                    if (p > 0) portsToBind.Add(p);
                }
            }

            _logService.Telemetry.BoundPorts.Clear();

            foreach (var port in portsToBind)
            {
                try
                {
                    var server = DicomServerFactory.Create<BridgeDicomProvider>(port);
                    _activeServers.Add(server);
                    _logService.Telemetry.BoundPorts.Add(port);
                    _logService.Log("DICOM-SCP", $"✅ DICOM Storage & Echo SCP successfully listening on Port {port} (AE Title: {_config.AeTitle})", "SUCCESS");
                }
                catch (Exception ex)
                {
                    _logService.Log("DICOM-SCP", $"⚠️ Could not bind DICOM listener to Port {port}: {ex.Message}", "WARN");
                }
            }

            _logService.Telemetry.DicomListenerActive = _activeServers.Count > 0;
            if (_activeServers.Count == 0)
            {
                _logService.Log("DICOM-SCP", "❌ Critical: No DICOM listening ports could be bound. Check firewall/admin permissions.", "ERROR");
            }
            else
            {
                _logService.Log("SYSTEM", $"SynOS Remote Bridge is ready. Active AE: '{_config.AeTitle}' across {string.Join(", ", _logService.Telemetry.BoundPorts)}", "SUCCESS");
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }

            foreach (var server in _activeServers)
            {
                try { server.Dispose(); } catch { }
            }
            _logService.Telemetry.DicomListenerActive = false;
            _logService.Log("SYSTEM", "DICOM SCP listeners stopped.", "INFO");
        }

        public static async Task<(bool Success, long LatencyMs, string Message)> PingScannerAsync(
            string host,
            int port,
            string scannerAe,
            string localAe)
        {
            var sw = Stopwatch.StartNew();
            try
            {
                var client = DicomClientFactory.Create(host, port, false, localAe, scannerAe);
                var echoRequest = new DicomCEchoRequest();
                bool receivedSuccess = false;

                echoRequest.OnResponseReceived += (req, res) =>
                {
                    if (res.Status == DicomStatus.Success)
                    {
                        receivedSuccess = true;
                    }
                };

                await client.AddRequestAsync(echoRequest);
                await client.SendAsync();
                sw.Stop();

                if (receivedSuccess)
                {
                    return (true, sw.ElapsedMilliseconds, $"DICOM C-ECHO Success. Scanner '{scannerAe}' responded in {sw.ElapsedMilliseconds}ms.");
                }
                else
                {
                    return (false, sw.ElapsedMilliseconds, $"Scanner '{scannerAe}' responded but returned non-success status.");
                }
            }
            catch (Exception ex)
            {
                sw.Stop();
                return (false, sw.ElapsedMilliseconds, $"Ping failed ({ex.GetType().Name}): {ex.Message}");
            }
        }
    }

    public class BridgeDicomProvider : DicomService, IDicomServiceProvider, IDicomCStoreProvider, IDicomCEchoProvider
    {
        private static readonly ConcurrentDictionary<string, bool> KnownStudies = new();

        public BridgeDicomProvider(
            INetworkStream stream,
            Encoding fallbackEncoding,
            ILogger logger,
            DicomServiceDependencies dependencies)
            : base(stream, fallbackEncoding, logger, dependencies)
        {
        }

        public Task<DicomCEchoResponse> OnCEchoRequestAsync(DicomCEchoRequest request)
        {
            var callingAe = Association?.CallingAE ?? "UNKNOWN_AE";
            BridgeDicomScpService.SharedLogService?.Log(
                "C-ECHO",
                $"⚡ Incoming DICOM C-ECHO Ping from Scanner Console (Calling AE: {callingAe}) -> Accepted 0x0000 Success",
                "SUCCESS");

            return Task.FromResult(new DicomCEchoResponse(request, DicomStatus.Success));
        }

        public async Task<DicomCStoreResponse> OnCStoreRequestAsync(DicomCStoreRequest request)
        {
            var log = BridgeDicomScpService.SharedLogService;
            var cfg = BridgeDicomScpService.SharedConfig ?? new BridgeConfig();
            var uploader = BridgeDicomScpService.SharedCloudUploader;

            var studyUid = request.Dataset.GetSingleValueOrDefault(DicomTag.StudyInstanceUID, string.Empty);
            if (string.IsNullOrWhiteSpace(studyUid)) studyUid = Guid.NewGuid().ToString();

            var seriesUid = request.Dataset.GetSingleValueOrDefault(DicomTag.SeriesInstanceUID, string.Empty);
            if (string.IsNullOrWhiteSpace(seriesUid)) seriesUid = Guid.NewGuid().ToString();

            var sopUid = request.Dataset.GetSingleValueOrDefault(DicomTag.SOPInstanceUID, string.Empty);
            if (string.IsNullOrWhiteSpace(sopUid)) sopUid = Guid.NewGuid().ToString();

            var patientId = request.Dataset.GetSingleValueOrDefault(DicomTag.PatientID, "UNKNOWN_ID");
            var patientName = request.Dataset.GetSingleValueOrDefault(DicomTag.PatientName, "Unknown Patient").Replace('^', ' ').Trim();
            var modality = request.Dataset.GetSingleValueOrDefault(DicomTag.Modality, "CT");
            var instanceNum = request.Dataset.GetSingleValueOrDefault<int?>(DicomTag.InstanceNumber, null);

            var isNewStudy = KnownStudies.TryAdd(studyUid, true);
            if (isNewStudy && log != null)
            {
                log.Telemetry.StudiesReceived++;
                log.Log("DICOM-SCP", $"📁 Initiating Ingestion for Study '{studyUid}' | Modality: {modality} | Patient: {patientName} (MRN: {patientId})", "INFO");
            }

            try
            {
                // Save to local spool directory
                var targetDir = Path.Combine(Path.GetFullPath(cfg.SpoolDir), studyUid, seriesUid);
                if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);

                var filePath = Path.Combine(targetDir, $"{sopUid}.dcm");
                await request.File.SaveAsync(filePath);

                if (log != null)
                {
                    log.Telemetry.SlicesReceived++;
                    log.Telemetry.SpoolPending++;
                    log.Telemetry.LastDicomActivity = DateTime.Now;

                    var sliceText = instanceNum.HasValue ? $"#{instanceNum.Value}" : sopUid.Substring(0, Math.Min(8, sopUid.Length));
                    log.Log("DICOM-SCP", $"📥 Spooled Slice {sliceText} for {patientName} ({modality}) -> {Path.GetFileName(filePath)}", "INFO");
                }

                // Enqueue for cloud forwarding
                if (cfg.AutoForward && uploader != null)
                {
                    uploader.EnqueueFile(filePath, studyUid, seriesUid, sopUid);
                }

                return new DicomCStoreResponse(request, DicomStatus.Success);
            }
            catch (Exception ex)
            {
                log?.Log("DICOM-SCP", $"❌ Failed saving slice: {ex.Message}", "ERROR");
                return new DicomCStoreResponse(request, DicomStatus.ProcessingFailure);
            }
        }

        public Task OnCStoreRequestExceptionAsync(string tempFileName, Exception e)
        {
            BridgeDicomScpService.SharedLogService?.Log("DICOM-SCP", $"Exception handling C-STORE request for temp file {tempFileName}: {e.Message}", "ERROR");
            return Task.CompletedTask;
        }

        public Task OnReceiveAssociationRequestAsync(DicomAssociation association)
        {
            var callingAe = association.CallingAE;
            var calledAe = association.CalledAE;
            BridgeDicomScpService.SharedLogService?.Log(
                "DICOM-SCP",
                $"🤝 Scanner Association Requested: '{callingAe}' -> '{calledAe}'",
                "INFO");

            foreach (var pc in association.PresentationContexts)
            {
                pc.AcceptTransferSyntaxes(
                    DicomTransferSyntax.ExplicitVRLittleEndian,
                    DicomTransferSyntax.ImplicitVRLittleEndian,
                    DicomTransferSyntax.ExplicitVRBigEndian,
                    DicomTransferSyntax.JPEG2000Lossless,
                    DicomTransferSyntax.JPEGLSLossless,
                    DicomTransferSyntax.RLELossless
                );
            }

            return SendAssociationAcceptAsync(association);
        }

        public Task OnReceiveAssociationReleaseRequestAsync()
        {
            BridgeDicomScpService.SharedLogService?.Log(
                "DICOM-SCP",
                $"👋 Scanner Association Released cleanly.",
                "INFO");
            return SendAssociationReleaseResponseAsync();
        }

        public void OnReceiveAbort(DicomAbortSource source, DicomAbortReason reason)
        {
            BridgeDicomScpService.SharedLogService?.Log(
                "DICOM-SCP",
                $"⚠️ Association Aborted from source {source}: {reason}",
                "WARN");
        }

        public void OnConnectionClosed(Exception exception)
        {
            if (exception != null)
            {
                BridgeDicomScpService.SharedLogService?.Log(
                    "DICOM-SCP",
                    $"Connection closed with note: {exception.Message}",
                    "INFO");
            }
        }
    }
}
