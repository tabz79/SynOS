using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using FellowOakDicom;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Api.Hubs;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.PACS;
using SynOS.Services.PACS;

namespace SynOS.Api.Controllers.Radiology
{
    [ApiController]
    [Route("api/v1/radiology/pacs/bridge")]
    [AllowAnonymous]
    public class PacsBridgeController : ControllerBase
    {
        private readonly ILogger<PacsBridgeController> _logger;
        private readonly SynOSDbContext _db;
        private readonly IHubContext<BranchOperationsHub>? _hubContext;

        public PacsBridgeController(
            ILogger<PacsBridgeController> logger,
            SynOSDbContext db,
            IHubContext<BranchOperationsHub>? hubContext = null)
        {
            _logger = logger;
            _db = db;
            _hubContext = hubContext;
        }

        [HttpGet("health")]
        public IActionResult HealthCheck()
        {
            return Ok(new
            {
                status = "online",
                server = "SynOS PACS Cloud Ingestion API",
                timestamp = DateTime.UtcNow,
                version = "1.4.9"
            });
        }

        [HttpPost("ingest")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = 524288000)]
        public async Task<IActionResult> IngestDicomFiles([FromForm] List<IFormFile> files)
        {
            var uploadFiles = (files != null && files.Any()) ? files : Request.Form.Files.ToList();
            if (uploadFiles == null || !uploadFiles.Any())
            {
                return BadRequest(new { message = "No files received." });
            }

            var labId = Request.Headers["X-Bridge-LabId"].FirstOrDefault() ?? "LAB001";
            var bridgeKey = Request.Headers["X-Bridge-Key"].FirstOrDefault() ?? "DEFAULT_BRIDGE";

            _logger.LogInformation("Receiving {Count} DICOM slice(s) from Remote Bridge (Lab: {LabId})", uploadFiles.Count, labId);

            int importedCount = 0;
            string lastStudyUid = string.Empty;
            string lastPatientName = string.Empty;

            var pacsBaseDir = PacsStorageLocation.GetRootPath();

            // Default branch and admin user fallback
            var defaultBranch = await _db.Branches.FirstOrDefaultAsync() ?? new Branch
            {
                BranchId = Guid.Parse("A0000000-0000-0000-0000-000000000001"),
                Name = "Main Lab",
                Code = "MAIN"
            };
            var adminUser = await _db.Users.FirstOrDefaultAsync();
            var adminUserId = adminUser?.UserId ?? Guid.Empty;

            foreach (var formFile in uploadFiles)
            {
                try
                {
                    using var stream = new MemoryStream();
                    await formFile.CopyToAsync(stream);
                    stream.Position = 0;

                    var dicomFile = await DicomFile.OpenAsync(stream);
                    var dataset = dicomFile.Dataset;

                    var studyUid = dataset.GetSingleValueOrDefault(DicomTag.StudyInstanceUID, string.Empty);
                    if (string.IsNullOrWhiteSpace(studyUid)) studyUid = Guid.NewGuid().ToString();

                    var seriesUid = dataset.GetSingleValueOrDefault(DicomTag.SeriesInstanceUID, string.Empty);
                    if (string.IsNullOrWhiteSpace(seriesUid)) seriesUid = Guid.NewGuid().ToString();

                    var sopUid = dataset.GetSingleValueOrDefault(DicomTag.SOPInstanceUID, string.Empty);
                    if (string.IsNullOrWhiteSpace(sopUid)) sopUid = Guid.NewGuid().ToString();

                    var patientIdStr = dataset.GetSingleValueOrDefault(DicomTag.PatientID, "PATIENT-" + DateTime.Now.ToString("yyyyMMdd"));
                    var patientNameStr = dataset.GetSingleValueOrDefault(DicomTag.PatientName, "Radiology Patient");
                    var modalityStr = dataset.GetSingleValueOrDefault(DicomTag.Modality, "CT");
                    var seriesDesc = dataset.GetSingleValueOrDefault(DicomTag.SeriesDescription, $"{modalityStr} Series");
                    var instanceNumber = dataset.GetSingleValueOrDefault<int?>(DicomTag.InstanceNumber, null);
                    var accessionStr = dataset.GetSingleValueOrDefault(DicomTag.AccessionNumber, string.Empty);

                    lastStudyUid = studyUid;
                    lastPatientName = patientNameStr.Replace('^', ' ').Trim();

                    // 1. Save physical file to PACS structured disk storage
                    var targetDir = Path.Combine(pacsBaseDir, studyUid, seriesUid);
                    if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);

                    var filePath = Path.Combine(targetDir, $"{sopUid}.dcm");
                    await dicomFile.SaveAsync(filePath);
                    var relativeFilePath = Path.Combine("PACS", studyUid, seriesUid, $"{sopUid}.dcm");

                    var fileInfo = new FileInfo(filePath);
                    var fileSize = fileInfo.Exists ? fileInfo.Length : (long?)null;

                    // 2. Resolve or create Patient
                    var candidateMrn = patientIdStr.Length > 6 ? patientIdStr[..6] : patientIdStr;
                    var patient = await _db.Patients.FirstOrDefaultAsync(p => p.MRN == candidateMrn || p.MRN == patientIdStr || (p.DisplayName != null && p.DisplayName == patientNameStr));
                    if (patient == null)
                    {
                        var finalMrn = candidateMrn;
                        while (await _db.Patients.AnyAsync(p => p.MRN == finalMrn))
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
                        _db.Patients.Add(patient);
                        await _db.SaveChangesAsync();
                    }

                    // Resolve ModalityMaster
                    var modalityMaster = await _db.ModalityMasters.FirstOrDefaultAsync(m => m.Code == modalityStr || m.Name.Contains(modalityStr));

                    // Resolve valid Test
                    var validTest = await _db.Tests.FirstOrDefaultAsync(t =>
                        (modalityMaster != null && t.ModalityId == modalityMaster.ModalityId) ||
                        t.TestCode == modalityStr ||
                        t.Category.Contains(modalityStr) ||
                        t.TestName.Contains(modalityStr))
                        ?? await _db.Tests.FirstOrDefaultAsync(t => t.Category == "CT Scan" || t.Category == "X-Ray")
                        ?? await _db.Tests.FirstOrDefaultAsync();

                    // Resolve or create RadiologyStudy
                    var study = await _db.RadiologyStudies.FirstOrDefaultAsync(s =>
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
                            Token = $"RAD-{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                            TokenDate = DateTime.Today,
                            Status = SynOS.Models.Enums.VisitStatus.Completed,
                            CreatedAt = DateTime.UtcNow
                        };
                        _db.Visits.Add(visit);

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
                        _db.Orders.Add(order);

                        study = new RadiologyStudy
                        {
                            RadiologyStudyId = Guid.NewGuid(),
                            VisitId = visit.VisitId,
                            VisitTestId = order.OrderId,
                            PatientId = patient.PatientId,
                            Modality = modalityStr,
                            ModalityId = modalityMaster?.ModalityId ?? Guid.Empty,
                            AccessionNumber = string.IsNullOrEmpty(accessionStr)
                                ? $"ACC-{DateTime.UtcNow:yyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}"
                                : accessionStr,
                            ExternalStudyInstanceUid = studyUid,
                            ExternalSystemName = $"Bridge-{labId}",
                            Status = "Acquired",
                            CreatedBy = adminUserId,
                            CreatedAt = DateTimeOffset.UtcNow
                        };
                        _db.RadiologyStudies.Add(study);
                        await _db.SaveChangesAsync();
                    }
                    else
                    {
                        study.Status = "Acquired";
                        if (string.IsNullOrEmpty(study.ExternalStudyInstanceUid) || study.ExternalStudyInstanceUid != studyUid)
                        {
                            study.ExternalStudyInstanceUid = studyUid;
                        }
                        await _db.SaveChangesAsync();
                    }

                    // Resolve or create PacsSeries
                    var series = await _db.PacsSeries.FirstOrDefaultAsync(s => s.SeriesInstanceUid == seriesUid && s.RadiologyStudyId == study.RadiologyStudyId);
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
                        _db.PacsSeries.Add(series);
                        await _db.SaveChangesAsync();
                    }

                    // Resolve or create PacsInstance
                    var instance = await _db.PacsInstances.FirstOrDefaultAsync(i => i.SopInstanceUid == sopUid);
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
                        _db.PacsInstances.Add(instance);
                        await _db.SaveChangesAsync();
                    }

                    importedCount++;

                    // Broadcast real-time update
                    if (_hubContext != null)
                    {
                        try
                        {
                            await _hubContext.Clients.All.SendAsync("StudyAcquired", new
                            {
                                radiologyStudyId = study.RadiologyStudyId,
                                patientName = patient.DisplayName ?? patientNameStr,
                                modality = modalityStr,
                                sopUid = sopUid
                            });
                        }
                        catch { }
                    }
                }
                catch (Exception sliceEx)
                {
                    _logger.LogError(sliceEx, "Failed processing DICOM file {FileName} from bridge", formFile.FileName);
                }
            }

            return Ok(new
            {
                success = true,
                importedCount,
                studyUid = lastStudyUid,
                patientName = lastPatientName,
                message = $"Successfully ingested {importedCount} slice(s) into SynOS PACS."
            });
        }
    }
}
