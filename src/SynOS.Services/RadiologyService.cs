using AutoMapper;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SynOS.Services.Storage;
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

        public RadiologyService(
            SynOSDbContext context,
            IMapper mapper,
            IReportPdfRenderer pdfRenderer,
            IReportTemplateService templateService,
            IUserService userService,
            IFileStorageService fileStorageService,
            IOperationalEventWriter eventWriter) // ADDED
        {
            _context = context;
            _mapper = mapper;
            _pdfRenderer = pdfRenderer;
            _templateService = templateService;
            _userService = userService;
            _fileStorageService = fileStorageService;
            _eventWriter = eventWriter;
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
                    .ThenInclude(o => o.Test) // Corrected to o.Test
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null)
            {
                throw new KeyNotFoundException($"Visit with ID '{visitId}' not found.");
            }

            var radiologyOrders = visit.Orders
                .Where(o => o.Test != null && o.Department == "Radiology") // Corrected to o.Test
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

                var newStudy = new RadiologyStudy
                {
                    RadiologyStudyId = Guid.NewGuid(),
                    VisitId = visit.VisitId,
                    PatientId = visit.PatientId,
                    VisitTestId = order.OrderId,
                    Modality = order.Test?.Department ?? "Unknown", // Corrected to order.Test?.Department
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
            study.Status = "ResultDrafted";

            await _context.SaveChangesAsync();
            
            await _context.Entry(report).Reference(r => r.SignedBy).LoadAsync();
            await _context.Entry(report).Collection(r => r.Attachments).LoadAsync();

            return _mapper.Map<RadiologyReportDto>(report);
        }

        public async Task<IEnumerable<RadiologyStudyWorklistDto>> GetRadiologistWorklistAsync()
        {
            var worklistQuery = 
                from study in _context.RadiologyStudies
                where study.Status == "ReadyForReporting" && !study.IsSoftDeleted
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
                    PatientName = $"{patient.FirstName} {patient.LastName}",
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
                        ExternalViewerUrl = x.Study.ExternalViewerUrl
                    }).ToList()
                };
                worklist.Add(worklistItem);
            }

            return worklist;
        }

        public async Task<RadiologyStudyDetailDto> GetStudyDetailsAsync(Guid studyId)
        {
            var query = 
                from study in _context.RadiologyStudies
                where study.RadiologyStudyId == studyId
                join visit in _context.Visits on study.VisitId equals visit.VisitId
                join patient in _context.Patients on study.PatientId equals patient.PatientId
                join order in _context.Orders on study.VisitTestId equals order.OrderId
                join test in _context.Tests on order.TestId equals test.TestId // Corrected to join on Test entity
                join tech in _context.Users on study.AssignedTo equals tech.UserId into techGroup
                from tech in techGroup.DefaultIfEmpty()
                select new { study, visit, patient, order, test, tech }; // Corrected to test

            var result = await query.FirstOrDefaultAsync();

            if (result == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{studyId}' not found.");
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
            
            var dto = new RadiologyStudyDetailDto
            {
                StudyId = result.study.RadiologyStudyId,
                VisitId = result.study.VisitId,
                TestName = result.test.TestName, // Corrected to result.test.TestName
                Modality = result.study.Modality,
                StudyStatus = result.study.Status,
                CreatedAt = result.study.CreatedAt,
                AssignedToTechnicianName = result.tech?.Name,

                ExternalSystemName = result.study.ExternalSystemName,
                ExternalAccessionNumber = result.study.ExternalAccessionNumber,
                ExternalViewerUrl = result.study.ExternalViewerUrl,

                PatientId = result.study.PatientId,
                PatientName = $"{result.patient.FirstName} {result.patient.LastName}",
                PatientAge = (int)((DateTime.Today - result.patient.DateOfBirth).TotalDays / 365.25),
                PatientGender = result.patient.Gender,
                TokenNumber = result.visit.Token,

                Images = _mapper.Map<List<RadiologyImageDto>>(images),
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

        public async Task<IEnumerable<RadiologyStudyQueueDto>> GetTechnicianQueueAsync(string[] statuses)
        {
            var query = _context.RadiologyStudies.AsQueryable();

            if (statuses != null && statuses.Any())
            {
                query = query.Where(rs => statuses.Contains(rs.Status));
            }

            var results = await (
                from rs in query
                join v in _context.Visits on rs.VisitId equals v.VisitId
                join p in _context.Patients on rs.PatientId equals p.PatientId
                join o in _context.Orders on rs.VisitTestId equals o.OrderId
                join t in _context.Tests on o.TestId equals t.TestId // Corrected to join on Test entity
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
                    AssignedToTechnicianName = tech != null ? tech.Name : null
                }
            ).ToListAsync();

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

            if (study.Status != "Assigned")
            {
                throw new InvalidOperationException($"Cannot mark imaging completed for study in status '{study.Status}'. Expected 'Assigned'.");
            }

            study.Status = "ReadyForReporting";
            await _context.SaveChangesAsync();
        }

        public async Task<RadiologyReportDto> SignReportAsync(Guid studyId, Guid userId)
        {
             var query = 
                from study in _context.RadiologyStudies
                where study.RadiologyStudyId == studyId
                join visit in _context.Visits on study.VisitId equals visit.VisitId
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

            var reportData = new ReportDataModel
            {
                ReportTitle = $"Radiology Report - {studyEntity.Order.Test.TestName}", // Corrected to Test.TestName
                Modality = studyEntity.Modality,
                Patient = new PatientInfo
                {
                    Name = $"{studyEntity.Patient.FirstName} {studyEntity.Patient.LastName}",
                    PatientId = studyEntity.Patient.MRN,
                    DateOfBirth = studyEntity.Patient.DateOfBirth.ToString("yyyy-MM-dd"),
                    Gender = studyEntity.Patient.Gender.ToString(),
                    ContactInfo = studyEntity.Patient.CurrentPhoneNumber
                },
                Comments = report.RadiologyReport.Findings,
                Interpretation = report.RadiologyReport.Impression,
                Recommendations = report.RadiologyReport.AdditionalNotes,
                Signature = new SignatureDetails
                {
                    DoctorName = signingUser.Name,
                    Credentials = signingUser.Designation,
                },
                VerificationQrCodeContent = $"SynOS Report: {report.ReportId}",
                SignedAt = DateTimeOffset.UtcNow,
                ReportVersion = 1
            };

            var defaultTemplate = await _templateService.GetTemplatesAsync(studyEntity.Modality, false);
            var template = defaultTemplate.FirstOrDefault(t => t.IsDefault && t.Modality == studyEntity.Modality) ??
                           defaultTemplate.FirstOrDefault(t => t.IsDefault && string.IsNullOrEmpty(t.Modality));

            TemplateModel templateModel;
            if (template != null && !string.IsNullOrEmpty(template.TemplateJson))
            {
                templateModel =
                    System.Text.Json.JsonSerializer.Deserialize<TemplateModel>(template.TemplateJson);
            }
            else
            {
                templateModel = new TemplateModel { };
            }

            byte[] pdfBytes = await _pdfRenderer.GeneratePdfAsync(reportData, templateModel);

            string fileName =
                $"RadiologyReport_{studyEntity.Visit.Token}_{studyEntity.Order.Test.TestCode}_{DateTime.UtcNow:yyyyMMddHHmmss}.pdf"; // Corrected to Test.TestCode
            string fileUrl = await _fileStorageService.SaveFileAsync(
                pdfBytes,
                fileName,
                "radiology-reports");

            report.Status = "Signed";
            report.PdfUrl = fileUrl;
            report.SignedByUserId = userId;
            report.SignedAt = DateTimeOffset.UtcNow;
            studyEntity.Status = "Signed"; 

            var pdfAttachment = new ReportAttachment
            {
                AttachmentId = Guid.NewGuid(),
                ReportId = report.ReportId,
                Type = "ReportPdf",
                FileUrl = fileUrl,
                DisplayName = $"Radiology Report - {studyEntity.Order.Test.TestName}.pdf", // Corrected to Test.TestName
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
    }
}