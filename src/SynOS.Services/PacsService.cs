using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SynOS.Data;
using SynOS.Models.Configuration;
using SynOS.Models.DTOs.PACS;
using SynOS.Models.Entities;
using SynOS.Models.Entities.PACS;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace SynOS.Services
{
    public class PacsService : IPacsService
    {
        private readonly SynOSDbContext _context;
        private readonly PacsSettings _pacsSettings;

        public PacsService(SynOSDbContext context, IOptions<PacsSettings> pacsSettings)
        {
            _context = context;
            _pacsSettings = pacsSettings.Value;
        }

        public async Task<(Stream Stream, string ContentType)> GetDicomStreamAsync(Guid instanceId, Guid currentUserId)
        {
            var instance = await _context.PacsInstances.FindAsync(instanceId);

            if (instance == null)
            {
                throw new KeyNotFoundException($"PACS instance with ID '{instanceId}' not found.");
            }

            // TODO: Add proper permission validation (e.g., check if user is in the same Org)
            // For now, we just check for existence.

            if (!File.Exists(instance.FilePath))
            {
                throw new FileNotFoundException("The DICOM file for this instance was not found on the server.", instance.FilePath);
            }

            var stream = new FileStream(instance.FilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return (stream, instance.ContentType);
        }

        public async Task<PacsUploadResultDto> UploadDicomAsync(Guid radiologyStudyId, IReadOnlyList<IFormFile> files, Guid currentUserId)
        {
            var study = await _context.RadiologyStudies.FindAsync(radiologyStudyId);
            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{radiologyStudyId}' not found.");
            }

            // TODO: Validate OrgId and BranchId when they are available on the RadiologyStudy entity.

            var user = await _context.Users.FindAsync(currentUserId);
            if (user == null)
            {
                throw new KeyNotFoundException("Current user not found.");
            }
            
            // Simple role check for now
            var userRole = await _context.UserRoles.Include(ur => ur.Role).FirstOrDefaultAsync(ur => ur.UserId == currentUserId);
            var allowedRoles = new[] { "Radiologist", "XRayTech", "Admin" };
            if (userRole == null || !allowedRoles.Contains(userRole.Role.Name))
            {
                throw new UnauthorizedAccessException("User is not authorized to upload DICOM files.");
            }

            // Create one PacsSeries per upload call.
            var series = new PacsSeries
            {
                SeriesId = Guid.NewGuid(),
                RadiologyStudyId = radiologyStudyId,
                // OrgId = study.OrgId, // Add when available
                // BranchId = study.BranchId, // Add when available
                StudyInstanceUid = Guid.NewGuid().ToString(), // Placeholder
                SeriesInstanceUid = Guid.NewGuid().ToString(), // Placeholder
                CreatedBy = currentUserId
            };
            _context.PacsSeries.Add(series);

            var instanceIds = new List<Guid>();
            foreach (var file in files)
            {
                var instanceId = Guid.NewGuid();
                instanceIds.Add(instanceId);
                // Path: {RootPath}/{OrgId}/{BranchId}/{RadiologyStudyId}/{SeriesId}/{InstanceId}.dcm
                // Not including OrgId/BranchId in path until they are available.
                var directoryPath = Path.Combine(_pacsSettings.RootPath, radiologyStudyId.ToString(), series.SeriesId.ToString());
                Directory.CreateDirectory(directoryPath);
                var filePath = Path.Combine(directoryPath, $"{instanceId}.dcm");

                await using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var instance = new PacsInstance
                {
                    InstanceId = instanceId,
                    SeriesId = series.SeriesId,
                    RadiologyStudyId = radiologyStudyId,
                    // OrgId = study.OrgId, // Add when available
                    // BranchId = study.BranchId, // Add when available
                    StudyInstanceUid = series.StudyInstanceUid,
                    SeriesInstanceUid = series.SeriesInstanceUid,
                    SopInstanceUid = Guid.NewGuid().ToString(), // Placeholder
                    FilePath = filePath,
                    FileSizeBytes = file.Length,
                    ContentType = file.ContentType ?? "application/dicom",
                    CreatedBy = currentUserId
                };
                _context.PacsInstances.Add(instance);
            }

            // Optionally update study status
            if (study.Status == "PendingImaging" || study.Status == "Assigned")
            {
                study.Status = "ImagingCompleted";
            }
            
            await _context.SaveChangesAsync();

            return new PacsUploadResultDto
            {
                RadiologyStudyId = radiologyStudyId,
                SeriesId = series.SeriesId,
                InstancesCreated = instanceIds.Count,
                InstanceIds = instanceIds
            };
        }
    }
}
