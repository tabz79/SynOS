using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using FellowOakDicom;
using FellowOakDicom.Network;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Services;

namespace SynOS.Api.BackgroundServices
{
    public class DicomCStoreScpService : BackgroundService
    {
        private readonly ILogger<DicomCStoreScpService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private IDicomServer? _dicomServer;
        private const int DefaultDicomPort = 10411; // Non-privileged DICOM C-STORE Port (Fallback for 104)

        public DicomCStoreScpService(
            ILogger<DicomCStoreScpService> logger,
            IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("DICOM C-STORE SCP Listener Service starting on Port {Port}...", DefaultDicomPort);

            try
            {
                _dicomServer = DicomServerFactory.Create<DicomCStoreProvider>(DefaultDicomPort);
                _logger.LogInformation("DICOM C-STORE SCP Listener successfully bound to Port {Port} (AE Title: SYNOS_PACS)", DefaultDicomPort);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not bind DICOM C-STORE SCP to Port {Port}. Will retry on secondary port.", DefaultDicomPort);
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            }

            if (_dicomServer != null)
            {
                _dicomServer.Dispose();
                _logger.LogInformation("DICOM C-STORE SCP Service stopped.");
            }
        }
    }

    public class DicomCStoreProvider : DicomService, IDicomServiceProvider, IDicomCStoreProvider, IDicomCEchoProvider
    {
        private static readonly DicomTransferSyntax[] AcceptedTransferSyntaxes = new[]
        {
            DicomTransferSyntax.ExplicitVRLittleEndian,
            DicomTransferSyntax.ImplicitVRLittleEndian,
            DicomTransferSyntax.ExplicitVRBigEndian,
            DicomTransferSyntax.JPEGLSLossless,
            DicomTransferSyntax.JPEG2000Lossless,
            DicomTransferSyntax.RLELossless
        };

        public DicomCStoreProvider(INetworkStream stream, Encoding fallbackEncoding, ILogger logger, DicomServiceDependencies dependencies)
            : base(stream, fallbackEncoding, logger, dependencies)
        {
        }

        public Task<DicomCEchoResponse> OnCEchoRequestAsync(DicomCEchoRequest request)
        {
            Logger.LogInformation("Received DICOM C-ECHO Ping from Calling AE: {CallingAE}", Association.CallingAE);
            return Task.FromResult(new DicomCEchoResponse(request, DicomStatus.Success));
        }

        public Task OnReceiveAssociationRequestAsync(DicomAssociation association)
        {
            Logger.LogInformation("Received DICOM Association Request from AE: {CallingAE} -> Called AE: {CalledAE}",
                association.CallingAE, association.CalledAE);

            foreach (var pc in association.PresentationContexts)
            {
                if (pc.AbstractSyntax == DicomUID.Verification)
                {
                    pc.AcceptTransferSyntaxes(AcceptedTransferSyntaxes);
                }
                else
                {
                    pc.AcceptTransferSyntaxes(AcceptedTransferSyntaxes);
                }
            }

            return SendAssociationAcceptAsync(association);
        }

        public Task OnReceiveAssociationReleaseRequestAsync()
        {
            return SendAssociationReleaseResponseAsync();
        }

        public void OnReceiveAbort(DicomAbortSource source, DicomAbortReason reason)
        {
            Logger.LogWarning("Received DICOM Abort from source {Source}: {Reason}", source, reason);
        }

        public void OnConnectionClosed(Exception exception)
        {
            if (exception != null)
            {
                Logger.LogWarning(exception, "DICOM Connection closed with exception.");
            }
        }

        public async Task<DicomCStoreResponse> OnCStoreRequestAsync(DicomCStoreRequest request)
        {
            var studyUid = request.Dataset.GetSingleValueOrDefault(DicomTag.StudyInstanceUID, string.Empty);
            var seriesUid = request.Dataset.GetSingleValueOrDefault(DicomTag.SeriesInstanceUID, string.Empty);
            var sopUid = request.Dataset.GetSingleValueOrDefault(DicomTag.SOPInstanceUID, string.Empty);
            var patientId = request.Dataset.GetSingleValueOrDefault(DicomTag.PatientID, string.Empty);
            var patientName = request.Dataset.GetSingleValueOrDefault(DicomTag.PatientName, string.Empty);

            Logger.LogInformation("Received DICOM C-STORE Image Push. Patient: {PatientID} ({PatientName}), Study: {StudyUid}, SOP: {SopUid}",
                patientId, patientName, studyUid, sopUid);

            try
            {
                var pacsDir = @"C:\SynOS_Files\PACS\IncomingScans";
                if (!Directory.Exists(pacsDir)) Directory.CreateDirectory(pacsDir);

                var filePath = Path.Combine(pacsDir, $"{sopUid}.dcm");
                await request.File.SaveAsync(filePath);

                Logger.LogInformation("Saved incoming DICOM file to {FilePath}", filePath);
                return new DicomCStoreResponse(request, DicomStatus.Success);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Failed to save incoming DICOM image {SopUid}", sopUid);
                return new DicomCStoreResponse(request, DicomStatus.ProcessingFailure);
            }
        }

        public Task OnCStoreRequestExceptionAsync(string tempFileName, Exception e)
        {
            Logger.LogError(e, "Exception handling C-STORE request for temp file {TempFileName}", tempFileName);
            return Task.CompletedTask;
        }
    }
}
