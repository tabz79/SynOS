using System.IO;
using System.IO.Compression;
using Microsoft.Extensions.Configuration;
using SynOS.Services.Storage;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SynOS.Models.DTOs.ReportTemplateDsl; // Added for TemplateModel
using SynOS.Services.Operational; // ADDED
using SynOS.Models.Enums; // ADDED

namespace SynOS.Services
{
    public class RadiologyService : IRadiologyService
    {
        private readonly SynOSDbContext _context;
        private readonly IMapper _mapper;
        private readonly IReportPdfRenderer _pdfRenderer;
        private readonly IReportTemplateService _templateService;
        private readonly IUserService _userService;
        private readonly IFileStorageService _fileStorageService;
        private readonly IOperationalEventWriter _eventWriter; // ADDED
        private readonly IConfiguration _configuration;
        private readonly IRadiologyImageSourceService _imageSourceService;
        private readonly IReportService _reportService;

        public RadiologyService(
            SynOSDbContext context,
            IMapper mapper,
            IReportPdfRenderer pdfRenderer,
            IReportTemplateService templateService,
            IUserService userService,
            IFileStorageService fileStorageService,
            IOperationalEventWriter eventWriter, // ADDED
            IConfiguration configuration,
            IRadiologyImageSourceService imageSourceService,
            IReportService reportService)
        {
            _context = context;
            _mapper = mapper;
            _pdfRenderer = pdfRenderer;
            _templateService = templateService;
            _userService = userService;
            _fileStorageService = fileStorageService;
            _eventWriter = eventWriter;
            _configuration = configuration;
            _imageSourceService = imageSourceService;
            _reportService = reportService;
        }

        public async Task<ReportAttachmentDto> AddAttachmentToStudyAsync(
            Guid studyId,
            Guid userId,
            string displayName,
            string fileUrl,
            string attachmentType)
        {
            var study = await _context.RadiologyStudies
                .FirstOrDefaultAsync(rs => rs.RadiologyStudyId == studyId);

            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{studyId}' not found.");
            }

            // Find or create the parent Report entity that acts as a container
            var report = await _context.Reports
                .Include(r => r.Attachments)
                .FirstOrDefaultAsync(r =>
                    r.SourceType == "RadiologyStudy" &&
                    r.SourceId == study.RadiologyStudyId);

            if (report == null)
            {
                report = new Report
                {
                    ReportId = Guid.NewGuid(),
                    VisitId = study.VisitId,
                    PatientId = study.PatientId,
                    Department = "Radiology",
                    SourceType = "RadiologyStudy",
                    SourceId = study.RadiologyStudyId,
                    Status = "Draft", // Initial status before any drafting/signing
                    CreatedAt = DateTimeOffset.UtcNow,
                    Attachments = new List<ReportAttachment>()
                };
                _context.Reports.Add(report);
            }
            else if (report.Attachments == null)
            {
                // Safety: make sure the collection is not null
                report.Attachments = new List<ReportAttachment>();
            }

            var newAttachment = new ReportAttachment
            {
                AttachmentId = Guid.NewGuid(),
                ReportId = report.ReportId,
                Type = attachmentType,
                FileUrl = fileUrl,
                DisplayName = displayName,
                CreatedAt = DateTimeOffset.UtcNow
            };

            report.Attachments.Add(newAttachment);
            _context.ReportAttachments.Add(newAttachment);

            if (attachmentType == "ImageZip")
            {
                try
                {
                    var basePath = _configuration["FileStorage:BasePath"] ?? "C:\\SynOS_Files";

                    // Remove any existing slices for this study to prevent image accumulation/bleeding on re-upload
                    var existingImages = await _context.RadiologyImages
                        .Where(ri => ri.RadiologyStudyId == study.RadiologyStudyId)
                        .ToListAsync();

                    if (existingImages.Any())
                    {
                        _context.RadiologyImages.RemoveRange(existingImages);
                        foreach (var img in existingImages)
                        {
                            try
                            {
                                var oldFilePath = Path.Combine(basePath, img.FileUrl);
                                if (System.IO.File.Exists(oldFilePath))
                                {
                                    System.IO.File.Delete(oldFilePath);
                                }
                            }
                            catch (Exception) { /* Fail silently */ }
                        }
                    }

                    var absoluteZipPath = Path.Combine(basePath, fileUrl);

                    var slicesDir = Path.Combine(basePath, "radiology-attachments", "slices");
                    if (!Directory.Exists(slicesDir))
                    {
                        Directory.CreateDirectory(slicesDir);
                    }

                    using (var archive = ZipFile.OpenRead(absoluteZipPath))
                    {
                        int seqNumber = 1;
                        foreach (var entry in archive.Entries)
                        {
                            if (entry.FullName.EndsWith(".dcm", StringComparison.OrdinalIgnoreCase))
                            {
                                var sliceGuid = Guid.NewGuid();
                                var sliceFileName = $"{sliceGuid}.dcm";
                                var absoluteSlicePath = Path.Combine(slicesDir, sliceFileName);

                                // Extract raw DICOM file directly to disk
                                entry.ExtractToFile(absoluteSlicePath, true);

                                // Save relative path in database relative to BasePath
                                var relativeSliceUrl = Path.Combine("radiology-attachments", "slices", sliceFileName).Replace('\\', '/');

                                // Parse UIDs using FellowOakDicom
                                string studyInstanceUid = null;
                                string seriesInstanceUid = null;
                                string sopInstanceUid = null;

                                try
                                {
                                    using (var fs = new FileStream(absoluteSlicePath, FileMode.Open, FileAccess.Read))
                                    {
                                        var dicomFile = FellowOakDicom.DicomFile.Open(fs);
                                        studyInstanceUid = dicomFile.Dataset.GetSingleValueOrDefault(FellowOakDicom.DicomTag.StudyInstanceUID, (string)null);
                                        seriesInstanceUid = dicomFile.Dataset.GetSingleValueOrDefault(FellowOakDicom.DicomTag.SeriesInstanceUID, (string)null);
                                        sopInstanceUid = dicomFile.Dataset.GetSingleValueOrDefault(FellowOakDicom.DicomTag.SOPInstanceUID, (string)null);
                                    }
                                }
                                catch (Exception)
                                {
                                    // Fallback silently if parsing fails, ensuring raw registration completes
                                }

                                var radiologyImage = new RadiologyImage
                                {
                                    ImageId = sliceGuid,
                                    RadiologyStudyId = study.RadiologyStudyId,
                                    FileName = entry.Name,
                                    FileUrl = relativeSliceUrl,
                                    ViewLabel = $"Slice {seqNumber}",
                                    SeriesNumber = 1,
                                    SequenceNumber = seqNumber,
                                    StudyInstanceUid = studyInstanceUid,
                                    SeriesInstanceUid = seriesInstanceUid,
                                    SopInstanceUid = sopInstanceUid,
                                    UploadedAt = DateTimeOffset.UtcNow,
                                    UploadedBy = userId
                                };

                                _context.RadiologyImages.Add(radiologyImage);
                                seqNumber++;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    throw new InvalidOperationException($"Failed to extract and register DICOM study slices: {ex.Message}", ex);
                }
            }

            // If this is the first image attachment, update the study status
            bool hadImageBefore =
                report.Attachments
                      .Where(a => a.AttachmentId != newAttachment.AttachmentId)
                      .Any(att => att.Type == "ImagePdf" || att.Type == "ImageZip");



            await _context.SaveChangesAsync();

            return _mapper.Map<ReportAttachmentDto>(newAttachment);
        }

        public async Task AssignStudyAsync(Guid studyId, Guid userId)
        {
            var study = await _context.RadiologyStudies.FindAsync(studyId);
            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{studyId}' not found.");
            }

            if (study.Status != "PendingImaging")
            {
                throw new InvalidOperationException(
                    $"Cannot assign study. Status is '{study.Status}', not 'PendingImaging'.");
            }

            study.AssignedTo = userId;
            study.Status = "Assigned";

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<RadiologyStudyDto>> CreateRadiologyStudiesForVisitAsync(
            Guid visitId,
            Guid userId)
        {
            var visit = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test) 
                        .ThenInclude(t => t.DepartmentMaster)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test) 
                        .ThenInclude(t => t.ModalityMaster)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null)
            {
                throw new KeyNotFoundException($"Visit with ID '{visitId}' not found.");
            }

            var radiologyOrders = visit.Orders
                .Where(o => o.Test != null && o.Department == "Radiology")
                .ToList();

            if (!radiologyOrders.Any())
            {
                return new List<RadiologyStudyDto>();
            }

            var radiologyOrderIds = radiologyOrders.Select(ro => ro.OrderId).ToList();

            var existingStudies = await _context.RadiologyStudies
                .Where(rs => radiologyOrderIds.Contains(rs.VisitTestId))
                .ToListAsync();

            var createdStudies = new List<RadiologyStudy>();

            foreach (var order in radiologyOrders)
            {
                if (existingStudies.Any(rs => rs.VisitTestId == order.OrderId))
                {
                    continue;
                }

                if (order.Test == null) continue;

                var newStudy = new RadiologyStudy
                {
                    RadiologyStudyId = Guid.NewGuid(),
                    VisitId = visit.VisitId,
                    PatientId = visit.PatientId,
                    VisitTestId = order.OrderId,
                    ModalityId = order.Test.ModalityId ?? throw new InvalidOperationException($"Test '{order.Test.TestCode}' belongs to a Radiology department but has no ModalityId assigned."),
                    Modality = order.Test.ModalityMaster?.Name ?? order.Test.Category ?? "Unknown",
                    Status = "PendingImaging",
                    CreatedBy = userId,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                createdStudies.Add(newStudy);
            }

            if (createdStudies.Any())
            {
                _context.RadiologyStudies.AddRange(createdStudies);
                await _context.SaveChangesAsync();
            }
            
            var allStudiesForVisit = await _context.RadiologyStudies
                .Where(rs => radiologyOrderIds.Contains(rs.VisitTestId))
                .ToListAsync();

            var ordersForStudies = await _context.Orders
                .Include(o => o.Test) // Corrected to o.Test
                .Where(o => radiologyOrderIds.Contains(o.OrderId))
                .ToListAsync();

            foreach(var study in allStudiesForVisit)
            {
                study.Order = ordersForStudies.FirstOrDefault(o => o.OrderId == study.VisitTestId);
            }

            return _mapper.Map<IEnumerable<RadiologyStudyDto>>(allStudiesForVisit);
        }

        public async Task<RadiologyReportDto> DraftReportAsync(RadiologyReportDraftDto dto, Guid userId)
        {
            var study = await _context.RadiologyStudies.FindAsync(dto.StudyId);
            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{dto.StudyId}' not found.");
            }

            var now = DateTimeOffset.UtcNow;
            if (study.ClaimedByUserId != userId)
            {
                // Check if user has Typist/Admin/Radiologist role or is assigned typist
                bool isAuthorized = false;
                var userRecord = await _context.Users
                    .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.UserId == userId);

                if (userRecord != null && userRecord.UserRoles.Any(ur => ur.Role.Name == "Typist" || ur.Role.Name == "Admin" || ur.Role.Name == "Radiologist"))
                {
                    isAuthorized = true;
                }
                else if (study.ActiveSessionId.HasValue)
                {
                    var session = await _context.RadiologyDictationSessions.FindAsync(study.ActiveSessionId.Value);
                    if (session != null && (session.SessionStatus == "Active" || session.TypistUserId == userId))
                    {
                        isAuthorized = true;
                    }
                }
                
                if (!isAuthorized)
                {
                    throw new UnauthorizedAccessException("You do not have permission to draft this report.");
                }
            }
            else
            {
                // Automatically renew/extend sliding lease on active drafting
                study.ClaimedAt = now;
                study.LastActivityAt = now;
            }

            var report = await _context.Reports
                .Include(r => r.RadiologyReport)
                .FirstOrDefaultAsync(r => r.SourceId == study.RadiologyStudyId && r.SourceType == "RadiologyStudy");

            if (report?.RadiologyReport == null)
            {
                // This is a strict workflow violation. The structure should always exist before drafting.
                throw new InvalidOperationException($"Radiology report structure for study ID '{dto.StudyId}' not found. The reception flow failed to create it.");
            }

            // Update the existing radiology report's content
            report.RadiologyReport.Findings = dto.Findings;
            report.RadiologyReport.Impression = dto.Impression;
            report.RadiologyReport.AdditionalNotes = dto.AdditionalNotes;
            
            report.Status = "Draft";
            study.Status = "DraftReady";

            // Log granular clinical event report draft updated
            await _context.Entry(study).Reference(s => s.Visit).LoadAsync();
            if (study.Visit != null && study.Visit.BranchId.HasValue)
            {
                await _eventWriter.WriteEventAsync(
                    BranchEventType.VISIT_UPDATED,
                    study.Visit.BranchId.Value.ToString(),
                    study.Visit.VisitId.ToString(),
                    study.RadiologyStudyId.ToString(),
                    $"Radiology report draft updated for study ID '{study.RadiologyStudyId}'",
                    "User",
                    userId.ToString(),
                    false,
                    report.ReportId,
                    "Report"
                );
            }

            await _context.SaveChangesAsync();
            
            await _context.Entry(report).Reference(r => r.SignedBy).LoadAsync();
            await _context.Entry(report).Collection(r => r.Attachments).LoadAsync();

            return _mapper.Map<RadiologyReportDto>(report);
        }

        public async Task<IEnumerable<RadiologyStudyWorklistDto>> GetRadiologistWorklistAsync()
        {
            var worklistQuery = 
                from study in _context.RadiologyStudies
                where (study.Status == "AwaitingDictation" || study.Status == "DictationSessionStarted" || study.Status == "DraftReady" || study.Status == "AwaitingSignature") && !study.IsSoftDeleted
                join visit in _context.Visits on study.VisitId equals visit.VisitId
                join patient in _context.Patients on study.PatientId equals patient.PatientId
                join order in _context.Orders on study.VisitTestId equals order.OrderId
                join test in _context.Tests on order.TestId equals test.TestId // Corrected to join on Test entity
                join report in _context.Reports on new { SourceId = study.RadiologyStudyId, SourceType = "RadiologyStudy" } equals new { report.SourceId, report.SourceType }
                where report.Status == "Draft" || report.Status == "Pending"
                let radiologyReport = _context.RadiologyReports.FirstOrDefault(rr => rr.ReportId == report.ReportId)
                select new {
                    Study = study,
                    Visit = visit,
                    Patient = patient,
                    Order = order,
                    Test = test, // Corrected to Test
                    Report = report,
                    RadiologyReportExists = (radiologyReport != null)
                };

            var studiesWithReports = await worklistQuery
                .OrderBy(x => x.Visit.TokenDate)
                .ThenBy(x => x.Visit.Token)
                .ToListAsync();

            var groupedByVisit = studiesWithReports.GroupBy(x => x.Visit);

            var worklist = new List<RadiologyStudyWorklistDto>();

            foreach (var visitGroup in groupedByVisit)
            {
                var visit = visitGroup.Key;
                var patient = visitGroup.First().Patient;

                var worklistItem = new RadiologyStudyWorklistDto
                {
                    VisitId = visit.VisitId,
                    TokenNumber = visit.Token,
                    PatientName = FormatPatientName(patient.FirstName, patient.LastName),
                    PatientAge = (int)((DateTime.Today - patient.DateOfBirth).TotalDays / 365.25),
                    PatientGender = patient.Gender,
                    Studies = visitGroup.Select(x => new RadiologyStudyWorklistItemDto
                    {
                        StudyId = x.Study.RadiologyStudyId,
                        TestName = x.Test.TestName, // Correctly accessing from x.Test
                        Modality = x.Study.Modality,
                        StudyStatus = x.Study.Status,
                        HasReport = x.RadiologyReportExists,
                        ReportStatus = x.Report?.Status,
                        HasAttachments = false, // This needs to be calculated properly if attachments are on the RadiologyReport
                        ExternalSystemName = x.Study.ExternalSystemName,
                        ExternalAccessionNumber = x.Study.ExternalAccessionNumber,
                        ExternalViewerUrl = x.Study.ExternalViewerUrl,
                        ClaimedByUserId = x.Study.ClaimedByUserId,
                        ClaimedByUserName = x.Study.ClaimedByUser != null ? x.Study.ClaimedByUser.Name : null,
                        ClaimedAt = x.Study.ClaimedAt,
                        LastActivityAt = x.Study.LastActivityAt,
                        ActiveSessionId = x.Study.ActiveSessionId
                    }).ToList()
                };
                worklist.Add(worklistItem);
            }

            return worklist;
        }

        public async Task<RadiologyStudyDetailDto> GetStudyDetailsAsync(Guid studyId, Guid? userId = null)
        {
            var query = 
                from study in _context.RadiologyStudies
                where study.RadiologyStudyId == studyId
                join visit in _context.Visits on study.VisitId equals visit.VisitId
                join patient in _context.Patients on study.PatientId equals patient.PatientId
                join order in _context.Orders on study.VisitTestId equals order.OrderId into orderGroup
                from order in orderGroup.DefaultIfEmpty()
                join test in _context.Tests on (order != null ? order.TestId : Guid.Empty) equals test.TestId into testGroup
                from test in testGroup.DefaultIfEmpty()
                join tech in _context.Users on study.AssignedTo equals tech.UserId into techGroup
                from tech in techGroup.DefaultIfEmpty()
                select new { study, visit, patient, order, test, tech };

            var result = await query.FirstOrDefaultAsync();

            if (result == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{studyId}' not found.");
            }

            // Log granular clinical event VIEWPORT_OPENED
            if (userId.HasValue && result.visit.BranchId.HasValue)
            {
                await _eventWriter.WriteEventAsync(
                    BranchEventType.VISIT_UPDATED,
                    result.visit.BranchId.Value.ToString(),
                    result.visit.VisitId.ToString(),
                    studyId.ToString(),
                    $"Radiology study viewport opened for study ID '{studyId}'",
                    "User",
                    userId.Value.ToString(),
                    true, // Save immediately
                    studyId,
                    "RadiologyStudy"
                );
            }

            var images = await _context.RadiologyImages.Where(i => i.RadiologyStudyId == studyId).ToListAsync();
            var report = await _context.Reports
                .Include(r => r.RadiologyReport)
                .Include(r => r.Attachments)
                .Include(r => r.SignedBy)
                .AsNoTracking()
                .FirstOrDefaultAsync(r =>
                    r.SourceType == "RadiologyStudy" &&
                    r.SourceId == studyId);
            
            var imagesDto = _mapper.Map<List<RadiologyImageDto>>(images);
            foreach (var img in imagesDto)
            {
                img.FileUrl = _imageSourceService.GetImageWadoUrl(img.ImageId);
            }

            var dto = new RadiologyStudyDetailDto
            {
                StudyId = result.study.RadiologyStudyId,
                VisitId = result.study.VisitId,
                TestName = result.test != null ? result.test.TestName : (result.study.Modality + " Scan"),
                Modality = result.study.Modality,
                StudyStatus = result.study.Status,
                CreatedAt = result.study.CreatedAt,
                AssignedToTechnicianName = result.tech?.Name,

                ExternalSystemName = result.study.ExternalSystemName,
                ExternalAccessionNumber = result.study.ExternalAccessionNumber,
                ExternalViewerUrl = result.study.ExternalViewerUrl,

                PatientId = result.study.PatientId,
                PatientName = FormatPatientName(result.patient.FirstName, result.patient.LastName),
                PatientAge = (int)((DateTime.Today - result.patient.DateOfBirth).TotalDays / 365.25),
                PatientGender = result.patient.Gender,
                TokenNumber = result.visit.Token,

                ClaimedByUserId = result.study.ClaimedByUserId,
                ClaimedByUserName = result.study.ClaimedByUser != null ? result.study.ClaimedByUser.Name : null,
                ClaimedAt = result.study.ClaimedAt,
                LastActivityAt = result.study.LastActivityAt,
                ActiveSessionId = result.study.ActiveSessionId,

                Images = imagesDto,
                Attachments = report != null
                    ? _mapper.Map<List<ReportAttachmentDto>>(report.Attachments)
                    : new List<ReportAttachmentDto>()
            };

            if (report?.RadiologyReport != null)
            {
                dto.Report = _mapper.Map<RadiologyReportDto>(report);
            }

            return dto;
        }

        public async Task<IEnumerable<RadiologyStudyQueueDto>> GetTechnicianQueueAsync(string[] statuses, bool includeHistory = false)
        {
            var query = _context.RadiologyStudies.AsQueryable();

            if (statuses != null && statuses.Any())
            {
                query = query.Where(rs => statuses.Contains(rs.Status));
            }

            var today = DateTimeOffset.UtcNow.Date;
            var startDate = today.AddDays(-7);
            var nextDay = today.AddDays(1);
            
            // Differentiate between technician and radiologist requests:
            // For technicians (who query PendingImaging), AwaitingDictation/etc. are terminal.
            // For radiologists (who do not query PendingImaging), only Signed/Finalized/etc. are terminal.
            var isTechnicianRequest = statuses != null && statuses.Contains("PendingImaging");
            var terminalStatuses = isTechnicianRequest
                ? new List<string> { "AwaitingDictation", "DictationSessionStarted", "DraftReady", "AwaitingSignature", "Signed", "ManualVerified", "Finalized" }
                : new List<string> { "Signed", "ManualVerified", "Finalized" };

            if (!includeHistory)
            {
                query = query.Where(rs =>
                    (!terminalStatuses.Contains(rs.Status) && rs.CreatedAt >= startDate) ||
                    (terminalStatuses.Contains(rs.Status) && (rs.LastActivityAt ?? rs.CreatedAt) >= today && (rs.LastActivityAt ?? rs.CreatedAt) < nextDay)
                );
            }
            else
            {
                query = query.Where(rs =>
                    terminalStatuses.Contains(rs.Status) && (rs.LastActivityAt ?? rs.CreatedAt) >= startDate && (rs.LastActivityAt ?? rs.CreatedAt) < today
                );
            }

            var results = await (
                from rs in query
                join v in _context.Visits on rs.VisitId equals v.VisitId
                join p in _context.Patients on rs.PatientId equals p.PatientId
                join o in _context.Orders on rs.VisitTestId equals o.OrderId
                join t in _context.Tests on o.TestId equals t.TestId 
                join tech in _context.Users on rs.AssignedTo equals tech.UserId into techGroup
                from tech in techGroup.DefaultIfEmpty()
                orderby rs.CreatedAt
                select new RadiologyStudyQueueDto
                {
                    RadiologyStudyId = rs.RadiologyStudyId,
                    VisitId = rs.VisitId,
                    TokenNumber = v.Token,
                    PatientName = $"{p.FirstName} {p.LastName}",
                    PatientAge = (int)((DateTime.Today - p.DateOfBirth).TotalDays / 365.25),
                    PatientGender = p.Gender,
                    TestName = t.TestName, // Corrected to t.TestName
                    Modality = rs.Modality,
                    Status = rs.Status,
                    AssignedToTechnicianName = tech != null ? tech.Name : null,
                    ClaimedByUserId = rs.ClaimedByUserId,
                    ClaimedByUserName = rs.ClaimedByUser != null ? rs.ClaimedByUser.Name : null,
                    ClaimedAt = rs.ClaimedAt,
                    LastActivityAt = rs.LastActivityAt,
                    ActiveSessionId = rs.ActiveSessionId
                }
            ).ToListAsync();

            return results;
        }

        public async Task<IEnumerable<RadiologyStudyQueueDto>> GetPacsMasterArchiveAsync()
        {
            var query = _context.RadiologyStudies.AsQueryable();

            var results = await (
                from rs in query
                join v in _context.Visits on rs.VisitId equals v.VisitId
                join p in _context.Patients on rs.PatientId equals p.PatientId
                join o in _context.Orders on rs.VisitTestId equals o.OrderId into orderGroup
                from o in orderGroup.DefaultIfEmpty()
                join t in _context.Tests on (o != null ? o.TestId : Guid.Empty) equals t.TestId into testGroup
                from t in testGroup.DefaultIfEmpty()
                join tech in _context.Users on rs.AssignedTo equals tech.UserId into techGroup
                from tech in techGroup.DefaultIfEmpty()
                orderby rs.CreatedAt descending
                select new RadiologyStudyQueueDto
                {
                    RadiologyStudyId = rs.RadiologyStudyId,
                    VisitId = rs.VisitId,
                    TokenNumber = v.Token,
                    Uhid = p.MRN ?? p.PatientId.ToString(),
                    AccessionNumber = string.IsNullOrWhiteSpace(rs.AccessionNumber) ? v.Token : rs.AccessionNumber,
                    PatientName = $"{p.FirstName} {p.LastName}".Trim(),
                    PatientAge = (int)((DateTime.Today - p.DateOfBirth).TotalDays / 365.25),
                    PatientGender = p.Gender,
                    TestName = t != null ? t.TestName : (rs.Modality + " Scan"),
                    Modality = rs.Modality,
                    Status = rs.Status,
                    AssignedToTechnicianName = tech != null ? tech.Name : null,
                    ClaimedByUserId = rs.ClaimedByUserId,
                    ClaimedByUserName = rs.ClaimedByUser != null ? rs.ClaimedByUser.Name : null,
                    ClaimedAt = rs.ClaimedAt,
                    LastActivityAt = rs.LastActivityAt,
                    CreatedAt = rs.CreatedAt,
                    ActiveSessionId = rs.ActiveSessionId
                }
            ).ToListAsync();

            var studyIds = results.Select(r => r.RadiologyStudyId).ToList();

            var pacsInstancesMap = await _context.PacsInstances
                .Where(pi => studyIds.Contains(pi.RadiologyStudyId))
                .OrderBy(pi => pi.InstanceNumber)
                .Select(pi => new { pi.RadiologyStudyId, InstanceId = pi.InstanceId, FileUrl = $"/api/v1/radiology/pacs/instances/{pi.InstanceId}/file", ContentType = pi.ContentType ?? "application/dicom" })
                .ToListAsync();

            var rawRadImages = await _context.RadiologyImages
                .Where(ri => studyIds.Contains(ri.RadiologyStudyId))
                .Select(ri => new { ri.RadiologyStudyId, ri.ImageId, ri.FileUrl })
                .ToListAsync();

            var radImagesMap = rawRadImages.Select(ri => new 
            { 
                ri.RadiologyStudyId, 
                InstanceId = ri.ImageId, 
                FileUrl = _fileStorageService.GetFileUrl(ri.FileUrl), 
                ContentType = "application/dicom" 
            }).ToList();

            var allImagesCombined = pacsInstancesMap.Concat(radImagesMap).ToList();

            var groupedInstances = allImagesCombined
                .GroupBy(i => i.RadiologyStudyId)
                .ToDictionary(g => g.Key, g => g.Select(i => new RadiologyStudyImageDto
                {
                    InstanceId = i.InstanceId,
                    FileUrl = i.FileUrl,
                    ContentType = i.ContentType
                }).ToList());

            foreach (var dto in results)
            {
                if (groupedInstances.TryGetValue(dto.RadiologyStudyId, out var imgs))
                {
                    dto.Images = imgs;
                }
            }

            return results;
        }

        public async Task SetExternalMappingAsync(RadiologyStudyExternalMappingDto dto, Guid userId)
        {
            var study = await _context.RadiologyStudies.FindAsync(dto.StudyId);
            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{dto.StudyId}' not found.");
            }

            study.ExternalSystemName = dto.SystemName;
            study.ExternalAccessionNumber = dto.AccessionNumber;
            study.ExternalViewerUrl = dto.ViewerUrl;

            await _context.SaveChangesAsync();
        }

        public async Task MarkImagingCompletedAsync(Guid studyId, Guid userId)
        {
            var study = await _context.RadiologyStudies.FindAsync(studyId);
            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{studyId}' not found.");
            }

            // Hard Stop Gate: Require at least 1 DICOM instance before releasing to radiologist dictation queue
            bool hasDicomImages = await _context.PacsInstances.AnyAsync(pi => pi.RadiologyStudyId == studyId);
            if (!hasDicomImages)
            {
                throw new InvalidOperationException("Cannot release study to reporting: No DICOM images have been acquired or uploaded for this study.");
            }

            study.Status = "AwaitingDictation";
            await _context.SaveChangesAsync();
        }

        public async Task<RadiologyReportDto> SignReportAsync(Guid studyId, Guid userId)
        {
             var query = 
                from study in _context.RadiologyStudies
                where study.RadiologyStudyId == studyId
                join visit in _context.Visits.Include(v => v.Referrer).Include(v => v.ReferralPartner) on study.VisitId equals visit.VisitId
                join patient in _context.Patients on study.PatientId equals patient.PatientId
                join order in _context.Orders on study.VisitTestId equals order.OrderId
                join test in _context.Tests on order.TestId equals test.TestId // Corrected to join on Test entity
                select new { study, visit, patient, order, test }; // Corrected to test

            var result = await query.FirstOrDefaultAsync();

            if (result == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{studyId}' not found.");
            }
            var studyEntity = result.study;

            // Enforce claim check (lease expiration check not required for signing since signature releases the study)
            var now = DateTimeOffset.UtcNow;
            if (studyEntity.ClaimedByUserId != userId)
            {
                throw new UnauthorizedAccessException("You do not have permission to sign this report. You must claim the study first.");
            }

            studyEntity.Visit = result.visit;
            studyEntity.Patient = result.patient;
            studyEntity.Order = result.order;
            studyEntity.Order.Test = result.test; // Corrected to Test


            var report = await _context.Reports
                .Include(r => r.RadiologyReport)
                .Include(r => r.Attachments)
                .FirstOrDefaultAsync(r =>
                    r.SourceType == "RadiologyStudy" &&
                    r.SourceId == studyEntity.RadiologyStudyId);

            if (report?.RadiologyReport == null)
            {
                throw new KeyNotFoundException(
                    $"Radiology report for study ID '{studyId}' not found or not drafted.");
            }

            if (report.Status == "Signed")
            {
                throw new InvalidOperationException(
                    $"Report for study ID '{studyId}' is already signed.");
            }

            var signingUser = await _userService.GetUserByIdAsync(userId);
            if (signingUser == null)
            {
                throw new KeyNotFoundException($"Signing user with ID '{userId}' not found.");
            }

            var narrativeBuilder = new System.Text.StringBuilder();
            if (!string.IsNullOrWhiteSpace(report.RadiologyReport.Findings))
            {
                narrativeBuilder.AppendLine("<h3>EXAMINATION & FINDINGS</h3>");
                narrativeBuilder.AppendLine($"<p>{report.RadiologyReport.Findings}</p>");
            }
            if (!string.IsNullOrWhiteSpace(report.RadiologyReport.Impression))
            {
                narrativeBuilder.AppendLine("<h3>IMPRESSION</h3>");
                narrativeBuilder.AppendLine($"<p><strong>{report.RadiologyReport.Impression}</strong></p>");
            }
            if (!string.IsNullOrWhiteSpace(report.RadiologyReport.AdditionalNotes))
            {
                narrativeBuilder.AppendLine("<h3>ADDITIONAL NOTES</h3>");
                narrativeBuilder.AppendLine($"<p>{report.RadiologyReport.AdditionalNotes}</p>");
            }
            var narrativeHtml = narrativeBuilder.ToString();

            var newVersionNumber = report.CurrentVersion + 1;

            var reportData = new ReportDataModel
            {
                Metadata = new ReportMetadata
                {
                    ContractVersion = 2,
                    GeneratedFrom = "live",
                    GeneratedAt = DateTimeOffset.UtcNow,
                    ReferenceDoctor = !string.IsNullOrWhiteSpace(result.visit?.ReferrerText) ? result.visit.ReferrerText : (!string.IsNullOrWhiteSpace(result.visit?.Referrer?.ProviderName) ? result.visit.Referrer.ProviderName : (result.visit?.ReferralPartner?.Name ?? "Self / Walk-in"))
                },
                ReportTitle = !string.IsNullOrWhiteSpace(studyEntity.Order.Test?.ReportTitle) ? studyEntity.Order.Test.ReportTitle : studyEntity.Order.Test?.TestName,
                Modality = studyEntity.Modality,
                Patient = new PatientInfo
                {
                    Name = FormatPatientName(studyEntity.Patient.FirstName, studyEntity.Patient.LastName),
                    PatientId = studyEntity.Patient.MRN,
                    DateOfBirth = studyEntity.Patient.DateOfBirth.ToString("yyyy-MM-dd"),
                    Gender = studyEntity.Patient.Gender.ToString(),
                    ContactInfo = studyEntity.Patient.CurrentPhoneNumber
                },
                Results = new List<ResultGroup>(),
                Comments = report.RadiologyReport.Findings,
                Interpretation = narrativeHtml,
                Recommendations = report.RadiologyReport.AdditionalNotes,
                Signatures = new List<ReportSignatureDetails>
                {
                    new ReportSignatureDetails
                    {
                        DoctorName = signingUser.Name,
                        Credentials = signingUser.Designation,
                        SignedAt = DateTimeOffset.UtcNow,
                        Role = "Radiologist"
                    }
                },
                Verification = new VerificationInfo
                {
                    QrCodeContent = $"SynOS Report: {report.ReportId}",
                    ReportVersion = newVersionNumber
                }
            };

            // Save / Update ReportInterpretation entity
            var interp = await _context.ReportInterpretations.FirstOrDefaultAsync(ri => ri.ReportId == report.ReportId);
            if (interp == null)
            {
                interp = new ReportInterpretation
                {
                    Id = Guid.NewGuid(),
                    ReportId = report.ReportId,
                    Summary = report.RadiologyReport.Impression ?? string.Empty,
                    Notes = narrativeHtml,
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.ReportInterpretations.Add(interp);
            }
            else
            {
                interp.Summary = report.RadiologyReport.Impression ?? string.Empty;
                interp.Notes = narrativeHtml;
                interp.UpdatedAt = DateTime.UtcNow;
            }

            // Create ReportVersion and ReportSnapshot
            var snapshotJson = System.Text.Json.JsonSerializer.Serialize(reportData, new System.Text.Json.JsonSerializerOptions
            {
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });

            var versionId = Guid.NewGuid();

            report.CurrentVersion = newVersionNumber;
            report.Status = "Signed";
            report.SignedByUserId = userId;
            report.SignedAt = DateTimeOffset.UtcNow;
            studyEntity.Status = "Signed"; 
            studyEntity.ClaimedByUserId = null;
            studyEntity.ClaimedAt = null;
            studyEntity.LastActivityAt = null;
            studyEntity.ActiveSessionId = null; 

            await _context.SaveChangesAsync();

            string fileUrl = await _reportService.EnsureAndRenderReportPdfAsync(report.ReportId, forceReRender: true);

            report.PdfUrl = fileUrl;

            var reportVersion = new ReportVersion
            {
                ReportVersionId = versionId,
                ReportId = report.ReportId,
                VersionNumber = newVersionNumber,
                PdfPath = fileUrl,
                SignedByUserId = userId,
                SignedAt = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _context.ReportVersions.Add(reportVersion);

            var snapshot = new ReportSnapshot
            {
                ReportVersionId = versionId,
                SnapshotJson = snapshotJson,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _context.ReportSnapshots.Add(snapshot);

            var pdfAttachment = new ReportAttachment
            {
                AttachmentId = Guid.NewGuid(),
                ReportId = report.ReportId,
                Type = "ReportPdf",
                FileUrl = fileUrl,
                DisplayName = $"Radiology Report - {studyEntity.Order.Test.TestName}.pdf",
                CreatedAt = DateTimeOffset.UtcNow
            };
            _context.ReportAttachments.Add(pdfAttachment);

            await _context.SaveChangesAsync();

            // Emit Operational Event
            if (studyEntity.Visit.BranchId.HasValue)
            {
                await _eventWriter.WriteEventAsync(
                    BranchEventType.REPORT_SIGNED,
                    studyEntity.Visit.BranchId.Value.ToString(),
                    studyEntity.Visit.VisitId.ToString(),
                    report.ReportId.ToString(),
                    $"Report signed (Version {report.CurrentVersion})",
                    "User",
                    userId.ToString(),
                    false, // Already saved
                    report.ReportId,
                    "Report"
                );
            }

            await _context.Entry(report).Reference(r => r.SignedBy).LoadAsync();
            await _context.Entry(report).Collection(r => r.Attachments).LoadAsync();

            return _mapper.Map<RadiologyReportDto>(report);
        }

        public async Task ResumeDictationAsync(Guid studyId, Guid userId)
        {
            var study = await _context.RadiologyStudies.FindAsync(studyId);
            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{studyId}' not found.");
            }

            if (study.Status != "DraftReady" && study.Status != "AwaitingSignature")
            {
                throw new InvalidOperationException($"Cannot resume dictation unless status is DraftReady or AwaitingSignature. Current status: '{study.Status}'");
            }

            study.Status = "DictationSessionStarted";
            await _context.SaveChangesAsync();
        }

        public async Task RequestSignatureAsync(Guid studyId, Guid userId)
        {
            var study = await _context.RadiologyStudies.FindAsync(studyId);
            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{studyId}' not found.");
            }

            if (study.Status != "DraftReady" && study.Status != "DictationSessionStarted" && study.Status != "AwaitingDictation" && study.Status != "AwaitingSignature")
            {
                throw new InvalidOperationException($"Cannot request signature for study in status '{study.Status}'");
            }

            study.Status = "AwaitingSignature";
            await _context.SaveChangesAsync();
        }

        private static string FormatPatientName(string firstName, string lastName)
        {
            var f = (firstName ?? "").Trim();
            var l = (lastName ?? "").Trim();
            if (string.Equals(l, "Patient", StringComparison.OrdinalIgnoreCase))
            {
                l = "";
            }
            return $"{f} {l}".Trim();
        }
    }
}