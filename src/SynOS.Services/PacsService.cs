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
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;
using SynOS.Services.DICOM;
using FellowOakDicom;
using SynOS.Services.Security;

namespace SynOS.Services
{
    public class PacsService : IPacsService
    {
        private readonly SynOSDbContext _context;
        private readonly PacsSettings _pacsSettings;
        private readonly IRadiologyAccessGuard _accessGuard;

        public PacsService(SynOSDbContext context, IOptions<PacsSettings> pacsSettings, IRadiologyAccessGuard accessGuard)
        {
            _context = context;
            _pacsSettings = pacsSettings.Value;
            _accessGuard = accessGuard;
        }

        public async Task<(Stream Stream, string ContentType)> GetDicomStreamAsync(Guid instanceId, Guid currentUserId)
        {
            var instance = await _context.PacsInstances.FindAsync(instanceId);
            if (instance == null)
            {
                throw new KeyNotFoundException($"PACS instance with ID '{instanceId}' not found.");
            }

            if (currentUserId != Guid.Empty)
            {
                await _accessGuard.EnsureCanAccessStudyAsync(instance.RadiologyStudyId, currentUserId);
            }

            if (!File.Exists(instance.FilePath))
            {
                throw new FileNotFoundException("The DICOM file for this instance could not be found on disk.", instance.FilePath);
            }

            var stream = new FileStream(instance.FilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return (stream, instance.ContentType);
        }

        public async Task<PacsUploadResultDto> UploadDicomAsync(Guid radiologyStudyId, IReadOnlyList<IFormFile> files, Guid currentUserId)
        {
            await _accessGuard.EnsureCanAccessStudyAsync(radiologyStudyId, currentUserId);

            var study = await _context.RadiologyStudies.FindAsync(radiologyStudyId);
            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{radiologyStudyId}' not found.");
            }
            
            var createdSeriesIds = new HashSet<Guid>();
            var createdInstanceIds = new List<Guid>();

            foreach (var file in files)
            {
                await using var stream = file.OpenReadStream();
                using var ms = new MemoryStream();
                await stream.CopyToAsync(ms);
                ms.Position = 0;

                // Check if uploaded file is a ZIP archive containing multiple DICOM files
                if (file.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase) || 
                    file.ContentType == "application/zip" || 
                    file.ContentType == "application/x-zip-compressed")
                {
                    try
                    {
                        using var archive = new ZipArchive(ms, ZipArchiveMode.Read, leaveOpen: true);
                        foreach (var entry in archive.Entries)
                        {
                            if (entry.Length == 0 || entry.FullName.StartsWith("__MACOSX") || entry.Name.StartsWith("."))
                                continue;

                            using var entryStream = entry.Open();
                            using var entryMs = new MemoryStream();
                            await entryStream.CopyToAsync(entryMs);
                            entryMs.Position = 0;

                            await ProcessSingleDicomStreamAsync(radiologyStudyId, study, entryMs, entry.Name, entry.Length, currentUserId, createdSeriesIds, createdInstanceIds);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[DICOM Upload Warning] Failed to unpack ZIP file '{file.FileName}': {ex.Message}");
                    }
                }
                else
                {
                    await ProcessSingleDicomStreamAsync(radiologyStudyId, study, ms, file.FileName, file.Length, currentUserId, createdSeriesIds, createdInstanceIds);
                }
            }

            if (!createdInstanceIds.Any())
            {
                throw new InvalidOperationException("No valid DICOM instances could be parsed from the uploaded file(s). Please verify the file is a valid .dcm dataset or a .zip containing .dcm files.");
            }

            if (study.Status == "PendingImaging" || study.Status == "Assigned")
            {
                study.Status = "ImagingCompleted";
            }

            await _context.SaveChangesAsync();

            return new PacsUploadResultDto
            {
                RadiologyStudyId = radiologyStudyId,
                SeriesId = createdSeriesIds.FirstOrDefault(),
                InstancesCreated = createdInstanceIds.Count,
                InstanceIds = createdInstanceIds
            };
        }

        private async Task ProcessSingleDicomStreamAsync(
            Guid radiologyStudyId, 
            RadiologyStudy study, 
            MemoryStream ms, 
            string fileName, 
            long fileSize, 
            Guid currentUserId, 
            HashSet<Guid> createdSeriesIds, 
            List<Guid> createdInstanceIds)
        {
            ms.Position = 0;
            DicomMetadata metadata;
            try
            {
                metadata = await DicomMetadataExtractor.ParseAsync(ms);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DICOM Upload Warning] Failed to parse file '{fileName}': {ex.Message}");
                return;
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
                    Modality = string.IsNullOrWhiteSpace(metadata.Modality) ? (study.Modality ?? "XR") : metadata.Modality,
                    Description = string.IsNullOrWhiteSpace(metadata.SeriesDescription) ? $"{study.Modality} Series" : metadata.SeriesDescription,
                    SeriesNumber = metadata.SeriesNumber ?? 1,
                    CreatedBy = currentUserId
                };
                _context.PacsSeries.Add(series);
                createdSeriesIds.Add(series.SeriesId);
            }

            var instanceId = Guid.NewGuid();
            var directoryPath = Path.Combine(_pacsSettings.RootPath, radiologyStudyId.ToString(), series.SeriesId.ToString());
            Directory.CreateDirectory(directoryPath);
            var filePath = Path.Combine(directoryPath, $"{instanceId}.dcm");
            
            ms.Position = 0;
            await using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await ms.CopyToAsync(fileStream);
            }

            var instance = new PacsInstance
            {
                InstanceId = instanceId,
                SeriesId = series.SeriesId,
                RadiologyStudyId = radiologyStudyId,
                StudyInstanceUid = metadata.StudyInstanceUid,
                SeriesInstanceUid = metadata.SeriesInstanceUid,
                SopInstanceUid = metadata.SopInstanceUid,
                InstanceNumber = metadata.InstanceNumber ?? 1,
                FrameCount = metadata.FrameCount ?? 1,
                FilePath = filePath,
                FileSizeBytes = fileSize > 0 ? fileSize : ms.Length,
                ContentType = "application/dicom",
                CreatedBy = currentUserId
            };
            _context.PacsInstances.Add(instance);
            createdInstanceIds.Add(instanceId);
        }

        public async Task<PacsUploadResultDto> AcquirePacsStudyAsync(Guid radiologyStudyId, Guid currentUserId)
        {
            await _accessGuard.EnsureCanAccessStudyAsync(radiologyStudyId, currentUserId);

            var study = await _context.RadiologyStudies.FindAsync(radiologyStudyId);
            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{radiologyStudyId}' not found.");
            }

            // Check if real DICOM instances have been pushed to the PACS vault for this study
            var existingInstances = await _context.PacsInstances
                .Where(pi => pi.RadiologyStudyId == radiologyStudyId)
                .ToListAsync();

            if (!existingInstances.Any())
            {
                var accessionNo = string.IsNullOrWhiteSpace(study.AccessionNumber) ? "N/A" : study.AccessionNumber;
                throw new InvalidOperationException($"No DICOM series detected on scanner C-STORE node for Accession '{accessionNo}'. Ensure the scanner has completed image export or upload DICOM files manually.");
            }

            var firstSeries = await _context.PacsSeries
                .FirstOrDefaultAsync(ps => ps.RadiologyStudyId == radiologyStudyId);

            return new PacsUploadResultDto
            {
                RadiologyStudyId = radiologyStudyId,
                SeriesId = firstSeries?.SeriesId ?? Guid.Empty,
                InstancesCreated = existingInstances.Count,
                InstanceIds = existingInstances.Select(i => i.InstanceId).ToList()
            };
        }

        public async Task<PacsReindexResultDto> ReindexStudyAsync(Guid radiologyStudyId, Guid currentUserId)
        {
            await _accessGuard.EnsureCanAccessStudyAsync(radiologyStudyId, currentUserId);

            var study = await _context.RadiologyStudies.FindAsync(radiologyStudyId);
            if (study == null)
            {
                // Redundant check, but good practice.
                throw new KeyNotFoundException($"Radiology study with ID '{radiologyStudyId}' not found.");
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
            if (currentUserId != Guid.Empty)
            {
                await _accessGuard.EnsureCanAccessStudyAsync(radiologyStudyId, currentUserId);
            }

            var study = await _context.RadiologyStudies.FindAsync(radiologyStudyId);
            if (study == null)
            {
                // Redundant check.
                throw new KeyNotFoundException($"Radiology study with ID '{radiologyStudyId}' not found.");
            }
            
            var allInstances = await _context.PacsInstances
                .Where(i => i.RadiologyStudyId == radiologyStudyId)
                .OrderBy(i => i.InstanceNumber)
                .ThenBy(i => i.InstanceId)
                .ToListAsync();

            if (allInstances.Count > _pacsSettings.MaxTotalInstancesPerStudyInSeriesTree)
            {
                throw new InvalidOperationException($"The study contains {allInstances.Count} instances, which exceeds the limit of {_pacsSettings.MaxTotalInstancesPerStudyInSeriesTree} for the series tree view.");
            }

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
                    .ToList();
                
                if (instancesForSeries.Count > _pacsSettings.MaxInstancesPerSeriesInSeriesTree)
                {
                    throw new InvalidOperationException($"Series {series.SeriesInstanceUid} contains {instancesForSeries.Count} instances, which exceeds the per-series limit of {_pacsSettings.MaxInstancesPerSeriesInSeriesTree}.");
                }

                var instanceNodes = instancesForSeries.Select(inst => new PacsInstanceNodeDto
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
                    InstanceCount = instanceNodes.Count,
                    Instances = instanceNodes
                };
            }).ToList();

            return new PacsSeriesTreeDto
            {
                RadiologyStudyId = radiologyStudyId,
                StudyInstanceUid = allSeries.First().StudyInstanceUid,
                Series = seriesNodes
            };
        }

        public async Task<PacsOrphanSummaryDto> GetOrphanSummaryAsync(Guid currentUserId)
        {
            await EnsureAdminUser(currentUserId);

            // Fetch file paths into memory before checking existence
            var allInstancePaths = await _context.PacsInstances
                .Where(i => !i.IsDeleted)
                .Select(i => i.FilePath)
                .ToListAsync();

            var instancesMissingFiles = allInstancePaths.Count(filePath => !File.Exists(filePath));

            var instancesWithMissingStudy = await _context.PacsInstances
                .Where(i => !i.IsDeleted && !_context.RadiologyStudies.Any(s => s.RadiologyStudyId == i.RadiologyStudyId))
                .CountAsync();
                
            var seriesWithNoInstances = await _context.PacsSeries
                .Where(s => !s.IsDeleted && !s.PacsInstances.Any(i => !i.IsDeleted))
                .CountAsync();

            return new PacsOrphanSummaryDto
            {
                InstancesMissingFiles = instancesMissingFiles,
                InstancesWithMissingStudy = instancesWithMissingStudy,
                SeriesWithNoInstances = seriesWithNoInstances
            };
        }

        public async Task<PacsStorageStatsDto> GetStorageStatsAsync(Guid currentUserId)
        {
            // Allow any staff member viewing PACS Archive to check storage stats

            var instances = await _context.PacsInstances
                .Where(i => !i.IsDeleted)
                .Select(i => new { i.FileSizeBytes, i.RadiologyStudyId, i.OrgId, i.BranchId })
                .ToListAsync();

            var totalStudies = instances.Select(i => i.RadiologyStudyId).Distinct().Count();
            var totalSeries = await _context.PacsSeries.CountAsync(s => !s.IsDeleted);

            // Grouping for by-org/branch stats
            var byOrgBranch = instances
                .GroupBy(i => new { i.OrgId, i.BranchId })
                .Select(g => new PacsOrgBranchStatsDto
                {
                    OrgId = g.Key.OrgId ?? Guid.Empty,
                    BranchId = g.Key.BranchId ?? Guid.Empty,
                    TotalBytes = g.Sum(i => i.FileSizeBytes ?? 0),
                    Studies = g.Select(i => i.RadiologyStudyId).Distinct().Count(),
                    Instances = g.Count()
                    // Series count per group is more complex and might require another query.
                    // For now, we omit it for simplicity.
                }).ToList();


            return new PacsStorageStatsDto
            {
                TotalBytes = instances.Sum(i => i.FileSizeBytes ?? 0),
                TotalStudies = totalStudies,
                TotalSeries = totalSeries,
                TotalInstances = instances.Count,
                ByOrgBranch = byOrgBranch
            };
        }

        public async Task<PacsOrphanSummaryDto> CleanupOrphansAsync(Guid currentUserId)
        {
            await EnsureAdminUser(currentUserId);

            // Rule: soft-delete DB records where the file is physically missing.
            // First fetch all candidates, then check for file existence on the client side.
            var allInstances = await _context.PacsInstances
                .Where(i => !i.IsDeleted)
                .ToListAsync();

            var instancesMissingFiles = allInstances
                .Where(i => !File.Exists(i.FilePath))
                .ToList();

            foreach (var instance in instancesMissingFiles)
            {
                instance.IsDeleted = true;
                instance.DeletedAt = DateTimeOffset.UtcNow;
                instance.DeletedBy = currentUserId;
            }

            // Rule: soft-delete series that have no instances left.
            var seriesWithNoInstances = await _context.PacsSeries
                .Where(s => !s.IsDeleted && !s.PacsInstances.Any(i => !i.IsDeleted))
                .ToListAsync();
            
            foreach (var series in seriesWithNoInstances)
            {
                series.IsDeleted = true;
                series.DeletedAt = DateTimeOffset.UtcNow;
                series.DeletedBy = currentUserId;
            }
            
            await _context.SaveChangesAsync();

            // Return the summary of what's left.
            return await GetOrphanSummaryAsync(currentUserId);
        }

        private async Task EnsureAdminUser(Guid currentUserId)
        {
            var user = await _context.Users
                .AsNoTracking()
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == currentUserId);

            if (user == null || !user.UserRoles.Any(ur => ur.Role.Name == "Admin"))
            {
                throw new UnauthorizedAccessException("User does not have Admin privileges.");
            }
        }
    }
}
