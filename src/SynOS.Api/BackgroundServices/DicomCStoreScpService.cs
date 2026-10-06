using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using FellowOakDicom;
using FellowOakDicom.Network;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SynOS.Api.Hubs;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.PACS;

namespace SynOS.Api.BackgroundServices
{
    public class DicomCStoreScpService : BackgroundService
    {
        private readonly ILogger<DicomCStoreScpService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly List<IDicomServer> _dicomServers = new();
        private static readonly int[] ListenPorts = new[] { 104, 8899, 10411 };

        public static IServiceScopeFactory? ServiceScopeFactory { get; private set; }

        public DicomCStoreScpService(
            ILogger<DicomCStoreScpService> logger,
            IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
            ServiceScopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("DICOM C-STORE Multi-Port SCP Listener Service starting...");

            foreach (var port in ListenPorts)
            {
                try
                {
                    var server = DicomServerFactory.Create<DicomCStoreProvider>(port);
                    _dicomServers.Add(server);
                    _logger.LogInformation("DICOM C-STORE SCP Listener successfully bound to Port {Port} (AE Title: SYNOS_PACS)", port);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Could not bind DICOM listener to Port {Port}: {Message}", port, ex.Message);
                }
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            }

            foreach (var server in _dicomServers)
            {
                try { server.Dispose(); } catch { }
            }
            _logger.LogInformation("DICOM C-STORE SCP Service stopped.");
        }
    }

    public class DicomCStoreProvider : DicomService, IDicomServiceProvider, IDicomCStoreProvider, IDicomCEchoProvider, IDicomCFindProvider
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

        public async IAsyncEnumerable<DicomCFindResponse> OnCFindRequestAsync(DicomCFindRequest request)
        {
            Console.WriteLine($"[DICOM-MWL] >>> OnCFindRequestAsync called from AE: {Association.CallingAE}, SOPClass: {request.SOPClassUID}");
            Logger.LogInformation("Received DICOM C-FIND Worklist (MWL) Query from AE: {CallingAE}, SOP Class: {SOPClassUID}",
                Association.CallingAE, request.SOPClassUID);

            List<RadiologyStudy> matchedStudies = new();
            try
            {
                if (DicomCStoreScpService.ServiceScopeFactory != null)
                {
                    using var scope = DicomCStoreScpService.ServiceScopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();

                    string filterPatientName = string.Empty;
                    string filterPatientId = string.Empty;
                    string filterAccession = string.Empty;
                    string filterModality = string.Empty;

                    if (request.Dataset != null)
                    {
                        if (request.Dataset.TryGetString(DicomTag.PatientName, out var pName)) filterPatientName = pName.Trim().Trim('*', '%');
                        if (request.Dataset.TryGetString(DicomTag.PatientID, out var pId)) filterPatientId = pId.Trim().Trim('*', '%');
                        if (request.Dataset.TryGetString(DicomTag.AccessionNumber, out var acc)) filterAccession = acc.Trim().Trim('*', '%');
                        if (request.Dataset.TryGetString(DicomTag.Modality, out var mod)) filterModality = mod.Trim();

                        if (string.IsNullOrEmpty(filterModality) && request.Dataset.Contains(DicomTag.ScheduledProcedureStepSequence))
                        {
                            var spsSeq = request.Dataset.GetSequence(DicomTag.ScheduledProcedureStepSequence);
                            if (spsSeq != null && spsSeq.Items.Count > 0)
                            {
                                if (spsSeq.Items[0].TryGetString(DicomTag.Modality, out var spsMod)) filterModality = spsMod.Trim();
                            }
                        }
                    }

                    // Query scheduled or ordered studies
                    var query = db.RadiologyStudies
                        .Include(s => s.Patient)
                        .Where(s => !s.IsSoftDeleted && (s.Status == "Scheduled" || s.Status == "Ordered" || s.Status == "Active"));

                    if (!string.IsNullOrEmpty(filterPatientId))
                    {
                        query = query.Where(s => s.Patient.MRN.Contains(filterPatientId));
                    }

                    if (!string.IsNullOrEmpty(filterPatientName))
                    {
                        var cleanFilter = filterPatientName.Replace("^", " ").Trim();
                        query = query.Where(s => (s.Patient.DisplayName != null && s.Patient.DisplayName.Contains(cleanFilter)) ||
                                                 (s.Patient.FirstName != null && s.Patient.FirstName.Contains(cleanFilter)) ||
                                                 (s.Patient.LastName != null && s.Patient.LastName.Contains(cleanFilter)) ||
                                                 (s.Patient.FirstName != null && s.Patient.LastName != null && (s.Patient.FirstName + " " + s.Patient.LastName).Contains(cleanFilter)));
                    }

                    if (!string.IsNullOrEmpty(filterAccession))
                    {
                        query = query.Where(s => s.AccessionNumber.Contains(filterAccession));
                    }

                    if (!string.IsNullOrEmpty(filterModality))
                    {
                        var mod = filterModality.Trim().ToUpper();
                        query = query.Where(s => s.Modality == filterModality ||
                                                 s.Modality.Contains(filterModality) ||
                                                 (mod == "CT" && s.Modality.Contains("CT")) ||
                                                 (mod == "MR" && (s.Modality.Contains("MR") || s.Modality.Contains("MRI"))) ||
                                                 ((mod == "CR" || mod == "DX" || mod == "XR") && (s.Modality.Contains("X-Ray") || s.Modality.Contains("CR") || s.Modality.Contains("DX"))));
                    }

                    matchedStudies = await query.OrderByDescending(s => s.CreatedAt).Take(50).ToListAsync();
                    bool needsSave = false;
                    foreach (var s in matchedStudies)
                    {
                        if (string.IsNullOrWhiteSpace(s.ExternalStudyInstanceUid) || !DicomUID.IsValidUid(s.ExternalStudyInstanceUid))
                        {
                            s.ExternalStudyInstanceUid = DicomUID.Generate().UID;
                            needsSave = true;
                        }
                    }
                    if (needsSave)
                    {
                        await db.SaveChangesAsync();
                    }
                    Logger.LogInformation("DICOM MWL C-FIND query matched {Count} scheduled studies.", matchedStudies.Count);
                }
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Exception querying scheduled studies for DICOM MWL C-FIND.");
            }

            foreach (var study in matchedStudies)
            {
                var validStudyUid = study.ExternalStudyInstanceUid;
                if (string.IsNullOrWhiteSpace(validStudyUid) || !DicomUID.IsValidUid(validStudyUid))
                {
                    validStudyUid = DicomUID.Generate().UID;
                }

                var patientName = study.Patient?.DisplayName;
                if (string.IsNullOrWhiteSpace(patientName))
                {
                    patientName = $"{study.Patient?.FirstName} {study.Patient?.LastName}".Trim();
                }
                if (string.IsNullOrWhiteSpace(patientName))
                {
                    patientName = "Patient^Unknown";
                }

                var accession = study.AccessionNumber;
                if (string.IsNullOrWhiteSpace(accession))
                {
                    accession = "ACC-" + study.RadiologyStudyId.ToString("N").Substring(0, 8);
                }

                var modality = study.Modality ?? "CT";

                var respDataset = new DicomDataset
                {
                    { DicomTag.SpecificCharacterSet, "ISO_IR 100" },
                    { DicomTag.PatientName, patientName },
                    { DicomTag.PatientID, study.Patient?.MRN ?? "UNKNOWN" },
                    { DicomTag.PatientBirthDate, study.Patient?.DateOfBirth.ToString("yyyyMMdd") ?? "19900101" },
                    { DicomTag.PatientSex, study.Patient?.Gender?.StartsWith("F", StringComparison.OrdinalIgnoreCase) == true ? "F" : "M" },
                    { DicomTag.AccessionNumber, accession },
                    { DicomTag.StudyInstanceUID, validStudyUid },
                    { DicomTag.StudyDescription, $"{modality} Diagnostic Scan" },
                    { DicomTag.RequestedProcedureID, study.RadiologyStudyId.ToString("N").Substring(0, 8) },
                    { DicomTag.RequestedProcedureDescription, $"{modality} Diagnostic Scan" }
                };

                // Scheduled Procedure Step Sequence (0040,0100)
                var spsItem = new DicomDataset
                {
                    { DicomTag.ScheduledStationAETitle, Association.CalledAE },
                    { DicomTag.ScheduledProcedureStepStartDate, study.CreatedAt.ToString("yyyyMMdd") },
                    { DicomTag.ScheduledProcedureStepStartTime, study.CreatedAt.ToString("HHmmss") },
                    { DicomTag.Modality, study.Modality ?? "CT" },
                    { DicomTag.ScheduledProcedureStepDescription, $"{study.Modality} Diagnostic Scan" },
                    { DicomTag.ScheduledProcedureStepID, "SPS-" + study.RadiologyStudyId.ToString("N").Substring(0, 8) }
                };

                respDataset.Add(new DicomSequence(DicomTag.ScheduledProcedureStepSequence, spsItem));

                yield return new DicomCFindResponse(request, DicomStatus.Pending) { Dataset = respDataset };
            }

            yield return new DicomCFindResponse(request, DicomStatus.Success);
        }

        public Task OnReceiveAssociationRequestAsync(DicomAssociation association)
        {
            Console.WriteLine($"[DICOM] Association Request from {association.CallingAE} to {association.CalledAE}, contexts: {association.PresentationContexts.Count}");
            Logger.LogInformation("Received DICOM Association Request from AE: {CallingAE} -> Called AE: {CalledAE}",
                association.CallingAE, association.CalledAE);

            foreach (var pc in association.PresentationContexts)
            {
                pc.AcceptTransferSyntaxes(AcceptedTransferSyntaxes);
            }

            return SendAssociationAcceptAsync(association);
        }

        public Task OnReceiveAssociationReleaseRequestAsync()
        {
            return SendAssociationReleaseResponseAsync();
        }

        public void OnReceiveAbort(DicomAbortSource source, DicomAbortReason reason)
        {
            Console.WriteLine($"[DICOM] Abort from source {source}: {reason}");
            Logger.LogWarning("Received DICOM Abort from source {Source}: {Reason}", source, reason);
        }

        public void OnConnectionClosed(Exception exception)
        {
            if (exception != null)
            {
                Console.WriteLine($"[DICOM] Connection closed with exception: {exception}");
                Logger.LogWarning(exception, "DICOM Connection closed with exception.");
            }
        }

        public async Task<DicomCStoreResponse> OnCStoreRequestAsync(DicomCStoreRequest request)
        {
            var studyUid = request.Dataset.GetSingleValueOrDefault(DicomTag.StudyInstanceUID, string.Empty);
            if (string.IsNullOrWhiteSpace(studyUid)) studyUid = Guid.NewGuid().ToString();

            var seriesUid = request.Dataset.GetSingleValueOrDefault(DicomTag.SeriesInstanceUID, string.Empty);
            if (string.IsNullOrWhiteSpace(seriesUid)) seriesUid = Guid.NewGuid().ToString();

            var sopUid = request.Dataset.GetSingleValueOrDefault(DicomTag.SOPInstanceUID, string.Empty);
            if (string.IsNullOrWhiteSpace(sopUid)) sopUid = Guid.NewGuid().ToString();

            var patientIdStr = request.Dataset.GetSingleValueOrDefault(DicomTag.PatientID, "PATIENT-" + DateTime.Now.ToString("yyyyMMdd"));
            var patientNameStr = request.Dataset.GetSingleValueOrDefault(DicomTag.PatientName, "Radiology Patient");
            var modalityStr = request.Dataset.GetSingleValueOrDefault(DicomTag.Modality, "CT");
            var studyDesc = request.Dataset.GetSingleValueOrDefault(DicomTag.StudyDescription, $"{modalityStr} Diagnostic Scan");
            var seriesDesc = request.Dataset.GetSingleValueOrDefault(DicomTag.SeriesDescription, $"{modalityStr} Series");
            var instanceNumber = request.Dataset.GetSingleValueOrDefault<int?>(DicomTag.InstanceNumber, null);
            var accessionStr = request.Dataset.GetSingleValueOrDefault(DicomTag.AccessionNumber, string.Empty);

            Logger.LogInformation("Received DICOM C-STORE Image Push. Patient: {PatientID} ({PatientName}), Study: {StudyUid}, SOP: {SopUid}, Accession: {Accession}",
                patientIdStr, patientNameStr, studyUid, sopUid, accessionStr);

            string? savedFilePath = null;
            try
            {
                // 1. Save physical file in structured PACS storage
                var pacsBaseDir = @"C:\SynOS_Files\PACS";
                var targetDir = Path.Combine(pacsBaseDir, studyUid, seriesUid);
                if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);

                var filePath = Path.Combine(targetDir, $"{sopUid}.dcm");
                await request.File.SaveAsync(filePath);
                savedFilePath = filePath;
                var relativeFilePath = Path.Combine("PACS", studyUid, seriesUid, $"{sopUid}.dcm");

                var fileInfo = new FileInfo(filePath);
                var fileSize = fileInfo.Exists ? fileInfo.Length : (long?)null;

                // 2. Ingest into SynOS PACS Database
                if (DicomCStoreScpService.ServiceScopeFactory != null)
                {
                    using var scope = DicomCStoreScpService.ServiceScopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                    var hubContext = scope.ServiceProvider.GetService<IHubContext<BranchOperationsHub>>();

                    // Resolve or create Patient
                    var candidateMrn = patientIdStr.Length > 6 ? patientIdStr.Substring(0, 6) : patientIdStr;
                    var patient = await db.Patients.FirstOrDefaultAsync(p => p.MRN == candidateMrn || p.MRN == patientIdStr || (p.DisplayName != null && p.DisplayName == patientNameStr));
                    if (patient == null)
                    {
                        // Ensure MRN is truly unique and strictly <= 6 characters
                        var finalMrn = candidateMrn;
                        while (await db.Patients.AnyAsync(p => p.MRN == finalMrn))
                        {
                            finalMrn = "EM" + Random.Shared.Next(1000, 9999);
                        }

                        patient = new Patient
                        {
                            PatientId = Guid.NewGuid(),
                            MRN = finalMrn,
                            FirstName = patientNameStr.Contains('^') ? patientNameStr.Split('^')[0] : patientNameStr,
                            LastName = patientNameStr.Contains('^') ? patientNameStr.Split('^').Last() : string.Empty,
                            DisplayName = patientNameStr.Replace('^', ' ').Trim(),
                            Gender = "Unknown",
                            DateOfBirth = DateTime.UtcNow.AddYears(-35),
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        db.Patients.Add(patient);
                        await db.SaveChangesAsync();
                    }

                    // Resolve Default Branch & Admin
                    var defaultBranch = await db.Branches.FirstOrDefaultAsync() ?? new Branch
                    {
                        BranchId = Guid.Parse("A0000000-0000-0000-0000-000000000001"),
                        Name = "Main Lab",
                        Code = "MAIN"
                    };

                    var adminUser = await db.Users.FirstOrDefaultAsync();
                    var adminUserId = adminUser?.UserId ?? Guid.Empty;

                    // Resolve ModalityMaster
                    var modalityMaster = await db.ModalityMasters.FirstOrDefaultAsync(m => m.Code == modalityStr || m.Name.Contains(modalityStr));

                    // Resolve valid Test from DB for emergency/unscheduled scan orders
                    var validTest = await db.Tests.FirstOrDefaultAsync(t =>
                        (modalityMaster != null && t.ModalityId == modalityMaster.ModalityId) ||
                        t.TestCode == modalityStr ||
                        t.Category.Contains(modalityStr) ||
                        t.TestName.Contains(modalityStr))
                        ?? await db.Tests.FirstOrDefaultAsync(t => t.Category == "CT Scan" || t.Category == "X-Ray")
                        ?? await db.Tests.FirstOrDefaultAsync();

                    // Resolve or create RadiologyStudy
                    var study = await db.RadiologyStudies.FirstOrDefaultAsync(s => 
                        s.ExternalStudyInstanceUid == studyUid ||
                        (!string.IsNullOrEmpty(accessionStr) && s.AccessionNumber == accessionStr));
                    if (study == null)
                    {
                        var visit = new Visit
                        {
                            VisitId = Guid.NewGuid(),
                            PatientId = patient.PatientId,
                            BranchId = defaultBranch.BranchId,
                            Department = "Radiology",
                            Token = "T" + DateTime.Now.ToString("HHmmss"),
                            TokenDate = DateTime.Today,
                            Status = SynOS.Models.Enums.VisitStatus.Completed,
                            CreatedAt = DateTime.UtcNow
                        };
                        db.Visits.Add(visit);

                        var order = new Order
                        {
                            OrderId = Guid.NewGuid(),
                            VisitId = visit.VisitId,
                            TestId = validTest?.TestId ?? Guid.NewGuid(),
                            TestCode = validTest?.TestCode ?? modalityStr,
                            Department = "Radiology",
                            Status = SynOS.Models.Enums.OrderStatus.Active,
                            Price = 0m,
                            Discount = 0m,
                            CreatedAt = DateTime.UtcNow
                        };
                        db.Orders.Add(order);

                        study = new RadiologyStudy
                        {
                            RadiologyStudyId = Guid.NewGuid(),
                            VisitId = visit.VisitId,
                            VisitTestId = order.OrderId,
                            PatientId = patient.PatientId,
                            Modality = modalityStr,
                            ModalityId = modalityMaster?.ModalityId ?? Guid.Empty,
                            AccessionNumber = string.IsNullOrEmpty(accessionStr) ? "ACC-" + DateTime.Now.ToString("yyMMddHHmmss") : accessionStr,
                            ExternalStudyInstanceUid = studyUid,
                            ExternalSystemName = Association.CallingAE,
                            Status = "Acquired",
                            CreatedBy = adminUserId,
                            CreatedAt = DateTimeOffset.UtcNow
                        };
                        db.RadiologyStudies.Add(study);
                        await db.SaveChangesAsync();
                    }
                    else
                    {
                        study.Status = "Acquired";
                        if (string.IsNullOrEmpty(study.ExternalStudyInstanceUid) || study.ExternalStudyInstanceUid != studyUid)
                        {
                            study.ExternalStudyInstanceUid = studyUid;
                        }
                        await db.SaveChangesAsync();
                    }

                    // Resolve or create PacsSeries
                    var series = await db.PacsSeries.FirstOrDefaultAsync(s => s.SeriesInstanceUid == seriesUid && s.RadiologyStudyId == study.RadiologyStudyId);
                    if (series == null)
                    {
                        series = new PacsSeries
                        {
                            SeriesId = Guid.NewGuid(),
                            RadiologyStudyId = study.RadiologyStudyId,
                            BranchId = defaultBranch.BranchId,
                            StudyInstanceUid = studyUid,
                            SeriesInstanceUid = seriesUid,
                            Modality = modalityStr,
                            Description = seriesDesc,
                            CreatedBy = adminUserId,
                            CreatedAt = DateTimeOffset.UtcNow
                        };
                        db.PacsSeries.Add(series);
                        await db.SaveChangesAsync();
                    }

                    // Resolve or create PacsInstance
                    var instance = await db.PacsInstances.FirstOrDefaultAsync(i => i.SopInstanceUid == sopUid);
                    if (instance == null)
                    {
                        instance = new PacsInstance
                        {
                            InstanceId = Guid.NewGuid(),
                            SeriesId = series.SeriesId,
                            RadiologyStudyId = study.RadiologyStudyId,
                            BranchId = defaultBranch.BranchId,
                            StudyInstanceUid = studyUid,
                            SeriesInstanceUid = seriesUid,
                            SopInstanceUid = sopUid,
                            InstanceNumber = instanceNumber,
                            FilePath = relativeFilePath,
                            FileSizeBytes = fileSize,
                            ContentType = "application/dicom",
                            CreatedBy = adminUserId,
                            CreatedAt = DateTimeOffset.UtcNow
                        };
                        db.PacsInstances.Add(instance);
                        await db.SaveChangesAsync();
                    }

                    // 3. Real-Time SignalR Broadcast
                    if (hubContext != null)
                    {
                        try
                        {
                            await hubContext.Clients.All.SendAsync("StudyAcquired", new
                            {
                                radiologyStudyId = study.RadiologyStudyId,
                                patientName = patient.DisplayName ?? patientNameStr,
                                modality = modalityStr,
                                sopUid = sopUid
                            });
                        }
                        catch (Exception hubEx)
                        {
                            Logger.LogWarning(hubEx, "Failed to broadcast SignalR StudyAcquired event.");
                        }
                    }
                }

                Logger.LogInformation("Successfully ingested DICOM slice {SopUid} into SynOS PACS Database.", sopUid);
                return new DicomCStoreResponse(request, DicomStatus.Success);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Failed to ingest incoming DICOM image {SopUid}", sopUid);

                // Clean up orphaned .dcm file if saved before failure
                if (!string.IsNullOrEmpty(savedFilePath) && File.Exists(savedFilePath))
                {
                    try
                    {
                        File.Delete(savedFilePath);
                        Logger.LogInformation("Cleaned up orphaned DICOM file {FilePath} following database transaction failure.", savedFilePath);
                    }
                    catch (Exception delEx)
                    {
                        Logger.LogWarning(delEx, "Failed to clean up orphaned DICOM file {FilePath}", savedFilePath);
                    }
                }

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
