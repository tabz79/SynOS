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
using SynOS.Services.DICOM;
using FellowOakDicom;

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

            var user = await _context.Users.FindAsync(currentUserId);
            if (user == null)
            {
                throw new KeyNotFoundException("Current user not found.");
            }
            
            var userRole = await _context.UserRoles.Include(ur => ur.Role).FirstOrDefaultAsync(ur => ur.UserId == currentUserId);
            var allowedRoles = new[] { "Radiologist", "XRayTech", "Admin" };
            if (userRole == null || !allowedRoles.Contains(userRole.Role.Name))
            {
                throw new UnauthorizedAccessException("User is not authorized to upload DICOM files.");
            }

            var createdSeriesIds = new HashSet<Guid>();
            var createdInstanceIds = new List<Guid>();

            foreach (var file in files)
            {
                await using var stream = file.OpenReadStream();
                DicomMetadata metadata;
                try
                {
                    metadata = await DicomMetadataExtractor.ParseAsync(stream);
                }
                catch (SynOS.Services.DICOM.DicomValidationException ex)
                {
                    // For now, we skip invalid files. A more robust implementation might report them.
                    // Or fail the entire batch.
                    Console.WriteLine(ex.Message); // Or use ILogger
                    continue;
                }

                var series = await _context.PacsSeries.FirstOrDefaultAsync(s =>
                    s.RadiologyStudyId == radiologyStudyId &&
                    s.StudyInstanceUid == metadata.StudyInstanceUid &&
                    s.SeriesInstanceUid == metadata.SeriesInstanceUid);

                if (series == null)
                {
                    series = new PacsSeries
                    {
                        SeriesId = Guid.NewGuid(),
                        RadiologyStudyId = radiologyStudyId,
                        StudyInstanceUid = metadata.StudyInstanceUid,
                        SeriesInstanceUid = metadata.SeriesInstanceUid,
                        Modality = metadata.Modality,
                        Description = metadata.SeriesDescription,
                        SeriesNumber = metadata.SeriesNumber,
                        CreatedBy = currentUserId
                    };
                    _context.PacsSeries.Add(series);
                    createdSeriesIds.Add(series.SeriesId);
                }

                var instanceId = Guid.NewGuid();
                var directoryPath = Path.Combine(_pacsSettings.RootPath, radiologyStudyId.ToString(), series.SeriesId.ToString());
                Directory.CreateDirectory(directoryPath);
                var filePath = Path.Combine(directoryPath, $"{instanceId}.dcm");
                
                stream.Position = 0; // Reset stream position before copying
                await using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await stream.CopyToAsync(fileStream);
                }

                var instance = new PacsInstance
                {
                    InstanceId = instanceId,
                    SeriesId = series.SeriesId,
                    RadiologyStudyId = radiologyStudyId,
                    StudyInstanceUid = metadata.StudyInstanceUid,
                    SeriesInstanceUid = metadata.SeriesInstanceUid,
                    SopInstanceUid = metadata.SopInstanceUid,
                    InstanceNumber = metadata.InstanceNumber,
                    FrameCount = metadata.FrameCount,
                    FilePath = filePath,
                    FileSizeBytes = file.Length,
                    ContentType = file.ContentType ?? "application/dicom",
                    CreatedBy = currentUserId
                };
                _context.PacsInstances.Add(instance);
                createdInstanceIds.Add(instanceId);
            }

            if (study.Status == "PendingImaging" || study.Status == "Assigned")
            {
                study.Status = "ImagingCompleted";
            }

            await _context.SaveChangesAsync();

            return new PacsUploadResultDto
            {
                RadiologyStudyId = radiologyStudyId,
                SeriesId = createdSeriesIds.FirstOrDefault(), // Returns the first new series ID, if any
                InstancesCreated = createdInstanceIds.Count,
                InstanceIds = createdInstanceIds
            };
        }

        public async Task<PacsReindexResultDto> ReindexStudyAsync(Guid radiologyStudyId, Guid currentUserId)
        {
            var study = await _context.RadiologyStudies.FindAsync(radiologyStudyId);
            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{radiologyStudyId}' not found.");
            }

            // Simple permission check for now
            var user = await _context.Users.FindAsync(currentUserId);
            var userRole = await _context.UserRoles.Include(ur => ur.Role).FirstOrDefaultAsync(ur => ur.UserId == currentUserId);
            if (user == null || (userRole?.Role.Name != "Admin" && userRole?.Role.Name != "Radiologist"))
            {
                throw new UnauthorizedAccessException("User is not authorized to re-index this study.");
            }

            var instances = await _context.PacsInstances
                .Where(i => i.RadiologyStudyId == radiologyStudyId)
                .ToListAsync();

            var result = new PacsReindexResultDto { RadiologyStudyId = radiologyStudyId };
            var updatedSeries = new HashSet<Guid>();

            foreach (var instance in instances)
            {
                if (!File.Exists(instance.FilePath))
                {
                    result.InstancesFailed++;
                    continue;
                }

                try
                {
                    await using var stream = new FileStream(instance.FilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
                    var metadata = await DicomMetadataExtractor.ParseAsync(stream);

                    // Find or create the corresponding series
                    var series = await _context.PacsSeries.FirstOrDefaultAsync(s =>
                        s.RadiologyStudyId == radiologyStudyId &&
                        s.StudyInstanceUid == metadata.StudyInstanceUid &&
                        s.SeriesInstanceUid == metadata.SeriesInstanceUid);

                    if (series == null)
                    {
                        series = new PacsSeries
                        {
                            SeriesId = Guid.NewGuid(),
                            RadiologyStudyId = radiologyStudyId,
                            StudyInstanceUid = metadata.StudyInstanceUid,
                            SeriesInstanceUid = metadata.SeriesInstanceUid,
                            CreatedBy = currentUserId // or a system user
                        };
                        _context.PacsSeries.Add(series);
                    }

                    // Update series and instance metadata
                    series.Modality = metadata.Modality;
                    series.Description = metadata.SeriesDescription;
                    series.SeriesNumber = metadata.SeriesNumber;

                    instance.SeriesId = series.SeriesId;
                    instance.StudyInstanceUid = metadata.StudyInstanceUid;
                    instance.SeriesInstanceUid = metadata.SeriesInstanceUid;
                    instance.SopInstanceUid = metadata.SopInstanceUid;
                    instance.InstanceNumber = metadata.InstanceNumber;
                    instance.FrameCount = metadata.FrameCount;
                    
                    updatedSeries.Add(series.SeriesId);
                    result.InstancesUpdated++;
                }
                catch (Exception) // Could be DicomValidationException or others
                {
                    result.InstancesFailed++;
                }
            }

            result.SeriesUpdated = updatedSeries.Count;
            await _context.SaveChangesAsync();

            return result;
        }

        public async Task<PacsSeriesTreeDto> GetSeriesTreeAsync(Guid radiologyStudyId, Guid currentUserId, string apiBaseUrl)
        {
            var study = await _context.RadiologyStudies.FindAsync(radiologyStudyId);
            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{radiologyStudyId}' not found.");
            }
            
            // TODO: Add proper permission validation (e.g., check if user is in the same Org)

            var allInstances = await _context.PacsInstances
                .Where(i => i.RadiologyStudyId == radiologyStudyId)
                .OrderBy(i => i.InstanceNumber)
                .ThenBy(i => i.InstanceId)
                .ToListAsync();

            var allSeries = await _context.PacsSeries
                .Where(s => s.RadiologyStudyId == radiologyStudyId)
                .OrderBy(s => s.SeriesNumber)
                .ThenBy(s => s.SeriesId)
                .ToListAsync();

            if (!allSeries.Any())
            {
                return new PacsSeriesTreeDto { RadiologyStudyId = radiologyStudyId, StudyInstanceUid = string.Empty };
            }

            var seriesNodes = allSeries.Select(series =>
            {
                var instancesForSeries = allInstances
                    .Where(inst => inst.SeriesId == series.SeriesId)
                    .Select(inst => new PacsInstanceNodeDto
                    {
                        InstanceId = inst.InstanceId,
                        SopInstanceUid = inst.SopInstanceUid,
                        InstanceNumber = inst.InstanceNumber,
                        FrameCount = inst.FrameCount,
                        Wadouri = $"wadouri:{apiBaseUrl.TrimEnd('/')}/api/v1/radiology/pacs/instances/{inst.InstanceId}/file"
                    }).ToList();

                return new PacsSeriesNodeDto
                {
                    SeriesId = series.SeriesId,
                    SeriesInstanceUid = series.SeriesInstanceUid,
                    Modality = series.Modality,
                    Description = series.Description,
                    SeriesNumber = series.SeriesNumber,
                    InstanceCount = instancesForSeries.Count,
                    Instances = instancesForSeries
                };
            }).ToList();

            return new PacsSeriesTreeDto
            {
                RadiologyStudyId = radiologyStudyId,
                StudyInstanceUid = allSeries.First().StudyInstanceUid,
                Series = seriesNodes
            };
        }
    }
}
