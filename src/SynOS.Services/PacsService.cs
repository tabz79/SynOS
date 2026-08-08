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

        private class DicomStagedItemInfo
        {
            public string StagedFilePath { get; set; } = string.Empty;
            public DicomMetadata Metadata { get; set; } = null!;
        }

        public async Task<PacsUploadResultDto> UploadDicomAsync(Guid radiologyStudyId, IReadOnlyList<IFormFile> files, Guid currentUserId)
        {
            var summary = await ImportDicomEnterpriseAsync(radiologyStudyId, files, currentUserId);
            var firstSeries = await _context.PacsSeries.FirstOrDefaultAsync(s => s.RadiologyStudyId == radiologyStudyId);
            return new PacsUploadResultDto
            {
                RadiologyStudyId = radiologyStudyId,
                SeriesId = firstSeries?.SeriesId ?? Guid.Empty,
                InstancesCreated = summary.ImagesImported,
                InstanceIds = new List<Guid>()
            };
        }

        public async Task<PacsImportSummaryDto> ImportDicomEnterpriseAsync(Guid radiologyStudyId, IReadOnlyList<IFormFile> files, Guid currentUserId)
        {
            await _accessGuard.EnsureCanAccessStudyAsync(radiologyStudyId, currentUserId);

            var study = await _context.RadiologyStudies.FindAsync(radiologyStudyId);
            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{radiologyStudyId}' not found.");
            }

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var warningsList = new List<string>();

            // 1. Create Isolated Staging Directory
            var batchId = Guid.NewGuid();
            var stagingRoot = Path.Combine(Path.GetTempPath(), "SynOS_Staging", batchId.ToString());
            Directory.CreateDirectory(stagingRoot);

            var stagedItems = new List<DicomStagedItemInfo>();

            try
            {
                // 2. Stream and Unpack files into Staging Folder
                int fileIndex = 0;
                foreach (var file in files)
                {
                    await using var stream = file.OpenReadStream();
                    if (file.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase) || 
                        file.ContentType == "application/zip" || 
                        file.ContentType == "application/x-zip-compressed")
                    {
                        using var ms = new MemoryStream();
                        await stream.CopyToAsync(ms);
                        ms.Position = 0;

                        using var archive = new ZipArchive(ms, ZipArchiveMode.Read, leaveOpen: true);
                        foreach (var entry in archive.Entries)
                        {
                            if (entry.Length == 0 || entry.FullName.StartsWith("__MACOSX") || entry.Name.StartsWith("."))
                                continue;

                            var stagedPath = Path.Combine(stagingRoot, $"staged_{fileIndex++}.dcm");
                            await using (var entryStream = entry.Open())
                            await using (var stagedFileStream = new FileStream(stagedPath, FileMode.Create))
                            {
                                await entryStream.CopyToAsync(stagedFileStream);
                            }

                            // Sequential In-Memory DICOM Metadata Extraction
                            await using var stagedReadStream = new FileStream(stagedPath, FileMode.Open, FileAccess.Read, FileShare.Read);
                            try
                            {
                                var metadata = await DicomMetadataExtractor.ParseAsync(stagedReadStream);
                                
                                // Fatal Validation Checks
                                if (string.IsNullOrWhiteSpace(metadata.StudyInstanceUid) ||
                                    string.IsNullOrWhiteSpace(metadata.SeriesInstanceUid) ||
                                    string.IsNullOrWhiteSpace(metadata.SopInstanceUid))
                                {
                                    throw new SynOS.Services.DICOM.DicomValidationException($"Fatal: DICOM file '{entry.Name}' is missing essential UIDs (Study/Series/SOP Instance UID).");
                                }

                                if (string.IsNullOrWhiteSpace(metadata.SeriesDescription))
                                {
                                    warningsList.Add($"File '{entry.Name}' lacks SeriesDescription tag. Defaulted to '{study.Modality} Series'.");
                                }

                                stagedItems.Add(new DicomStagedItemInfo
                                {
                                    StagedFilePath = stagedPath,
                                    Metadata = metadata
                                });
                            }
                            catch (Exception ex) when (!(ex is SynOS.Services.DICOM.DicomValidationException))
                            {
                                warningsList.Add($"Failed to parse DICOM header for entry '{entry.Name}': {ex.Message}");
                            }
                        }
                    }
                    else
                    {
                        var stagedPath = Path.Combine(stagingRoot, $"staged_{fileIndex++}.dcm");
                        await using (var stagedFileStream = new FileStream(stagedPath, FileMode.Create))
                        {
                            await stream.CopyToAsync(stagedFileStream);
                        }

                        await using var stagedReadStream = new FileStream(stagedPath, FileMode.Open, FileAccess.Read, FileShare.Read);
                        try
                        {
                            var metadata = await DicomMetadataExtractor.ParseAsync(stagedReadStream);
                            if (string.IsNullOrWhiteSpace(metadata.StudyInstanceUid) ||
                                string.IsNullOrWhiteSpace(metadata.SeriesInstanceUid) ||
                                string.IsNullOrWhiteSpace(metadata.SopInstanceUid))
                            {
                                throw new SynOS.Services.DICOM.DicomValidationException($"Fatal: DICOM file '{file.FileName}' is missing essential UIDs (Study/Series/SOP Instance UID).");
                            }

                            stagedItems.Add(new DicomStagedItemInfo
                            {
                                StagedFilePath = stagedPath,
                                Metadata = metadata
                            });
                        }
                        catch (Exception ex) when (!(ex is SynOS.Services.DICOM.DicomValidationException))
                        {
                            warningsList.Add($"Failed to parse DICOM header for file '{file.FileName}': {ex.Message}");
                        }
                    }
                }

                if (!stagedItems.Any())
                {
                    throw new InvalidOperationException("No valid DICOM instances could be parsed from the uploaded dataset.");
                }

                // 3. Build 3-Tier Hierarchy Tree in Memory
                var inMemorySeriesGroups = stagedItems
                    .GroupBy(item => item.Metadata.SeriesInstanceUid)
                    .ToDictionary(g => g.Key, g => g.ToList());

                // 4. Single State Query to fetch existing PACS series & instances for RadiologyStudyId
                var existingSeriesList = await _context.PacsSeries
                    .Where(s => s.RadiologyStudyId == radiologyStudyId)
                    .ToListAsync();
                var existingSeriesMap = existingSeriesList.ToDictionary(s => s.SeriesInstanceUid, s => s);

                var existingInstancesList = await _context.PacsInstances
                    .Where(i => i.RadiologyStudyId == radiologyStudyId)
                    .ToListAsync();
                var existingSopUidSet = new HashSet<string>(existingInstancesList.Select(i => i.SopInstanceUid));

                var promotedFiles = new List<string>();
                int imagesImported = 0;
                int imagesSkipped = 0;

                // 5. Atomic Database Transaction with Pre-Commit File Promotion
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    foreach (var seriesGroup in inMemorySeriesGroups)
                    {
                        var seriesUid = seriesGroup.Key;
                        var firstItem = seriesGroup.Value.First();

                        if (!existingSeriesMap.TryGetValue(seriesUid, out var seriesEntity))
                        {
                            seriesEntity = new PacsSeries
                            {
                                SeriesId = Guid.NewGuid(),
                                RadiologyStudyId = radiologyStudyId,
                                StudyInstanceUid = firstItem.Metadata.StudyInstanceUid,
                                SeriesInstanceUid = seriesUid,
                                Modality = string.IsNullOrWhiteSpace(firstItem.Metadata.Modality) ? (study.Modality ?? "XR") : firstItem.Metadata.Modality,
                                Description = string.IsNullOrWhiteSpace(firstItem.Metadata.SeriesDescription) ? $"{study.Modality} Series" : firstItem.Metadata.SeriesDescription,
                                SeriesNumber = firstItem.Metadata.SeriesNumber ?? 1,
                                CreatedBy = currentUserId
                            };
                            _context.PacsSeries.Add(seriesEntity);
                            existingSeriesMap[seriesUid] = seriesEntity;
                        }

                        var prodSeriesDir = Path.Combine(_pacsSettings.RootPath, radiologyStudyId.ToString(), seriesEntity.SeriesId.ToString());
                        Directory.CreateDirectory(prodSeriesDir);

                        foreach (var item in seriesGroup.Value)
                        {
                            // Auto-Skip Duplicate SOPInstanceUIDs
                            if (existingSopUidSet.Contains(item.Metadata.SopInstanceUid))
                            {
                                imagesSkipped++;
                                continue;
                            }

                            var instanceId = Guid.NewGuid();
                            var prodFilePath = Path.Combine(prodSeriesDir, $"{instanceId}.dcm");

                            // Promote file from Staging to Production PACS archive before DB commit
                            File.Move(item.StagedFilePath, prodFilePath, overwrite: true);
                            promotedFiles.Add(prodFilePath);

                            var instanceEntity = new PacsInstance
                            {
                                InstanceId = instanceId,
                                SeriesId = seriesEntity.SeriesId,
                                RadiologyStudyId = radiologyStudyId,
                                StudyInstanceUid = item.Metadata.StudyInstanceUid,
                                SeriesInstanceUid = seriesUid,
                                SopInstanceUid = item.Metadata.SopInstanceUid,
                                InstanceNumber = item.Metadata.InstanceNumber ?? 1,
                                FrameCount = item.Metadata.FrameCount ?? 1,
                                FilePath = prodFilePath,
                                FileSizeBytes = new FileInfo(prodFilePath).Length,
                                ContentType = "application/dicom",
                                CreatedBy = currentUserId
                            };

                            _context.PacsInstances.Add(instanceEntity);
                            existingSopUidSet.Add(item.Metadata.SopInstanceUid);
                            imagesImported++;
                        }
                    }

                    if (study.Status == "PendingImaging" || study.Status == "Assigned")
                    {
                        study.Status = "ImagingCompleted";
                    }

                    stopwatch.Stop();

                    var auditLog = new PacsImportAuditLog
                    {
                        AuditLogId = Guid.NewGuid(),
                        RadiologyStudyId = radiologyStudyId,
                        CreatedBy = currentUserId,
                        StudyInstanceUid = inMemorySeriesGroups.FirstOrDefault().Key != null ? inMemorySeriesGroups.First().Value.First().Metadata.StudyInstanceUid : string.Empty,
                        ImportedAt = DateTime.UtcNow,
                        SeriesCount = inMemorySeriesGroups.Count,
                        ImagesImported = imagesImported,
                        ImagesSkipped = imagesSkipped,
                        WarningCount = warningsList.Count,
                        WarningsJson = System.Text.Json.JsonSerializer.Serialize(warningsList),
                        Status = "Success",
                        DurationMs = stopwatch.ElapsedMilliseconds
                    };

                    try
                    {
                        _context.PacsImportAuditLogs.Add(auditLog);
                        await _context.SaveChangesAsync();
                    }
                    catch (Exception auditEx)
                    {
                        // Fallback: If PacsImportAuditLogs table is pending migration, complete DICOM import gracefully
                        Console.WriteLine($"[PACS Import Audit Log Warning] Failed to write audit log: {auditEx.Message}");
                        _context.Entry(auditLog).State = EntityState.Detached;
                        await _context.SaveChangesAsync();
                    }

                    await transaction.CommitAsync();

                    return new PacsImportSummaryDto
                    {
                        RadiologyStudyId = radiologyStudyId,
                        StudyInstanceUid = auditLog.StudyInstanceUid,
                        StudyTitle = $"{study.Modality} Study",
                        SeriesCount = inMemorySeriesGroups.Count,
                        ImagesImported = imagesImported,
                        ImagesSkipped = imagesSkipped,
                        Warnings = warningsList,
                        DurationMs = stopwatch.ElapsedMilliseconds,
                        ImportedAt = auditLog.ImportedAt
                    };
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();

                    // Cleanup promoted files if transaction failed
                    foreach (var file in promotedFiles)
                    {
                        if (File.Exists(file))
                        {
                            try { File.Delete(file); } catch { }
                        }
                    }
                    throw;
                }
            }
            finally
            {
                // Purge Staging Directory
                if (Directory.Exists(stagingRoot))
                {
                    try { Directory.Delete(stagingRoot, recursive: true); } catch { }
                }
            }
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

            var study = await _context.RadiologyStudies
                .Include(s => s.Patient)
                .FirstOrDefaultAsync(s => s.RadiologyStudyId == radiologyStudyId);

            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{radiologyStudyId}' not found.");
            }

            var createdSeriesIds = new HashSet<Guid>();
            var createdInstanceIds = new List<Guid>();

            // 1. Scan IncomingScans directory for DICOM files pushed by local scanner consoles over DICOM C-STORE
            var incomingDir = @"C:\SynOS_Files\PACS\IncomingScans";
            if (Directory.Exists(incomingDir))
            {
                var dcmFiles = Directory.GetFiles(incomingDir, "*.dcm", SearchOption.TopDirectoryOnly);
                foreach (var file in dcmFiles)
                {
                    try
                    {
                        var bytes = await File.ReadAllBytesAsync(file);
                        using var ms = new MemoryStream(bytes);
                        await ProcessSingleDicomStreamAsync(radiologyStudyId, study, ms, Path.GetFileName(file), bytes.Length, currentUserId, createdSeriesIds, createdInstanceIds);
                        
                        // Clean up processed file from incoming staging
                        try { File.Delete(file); } catch { }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[AcquirePacsStudy Warning] Failed to process incoming DICOM file '{file}': {ex.Message}");
                    }
                }
            }

            if (createdInstanceIds.Any())
            {
                await _context.SaveChangesAsync();
            }

            // 2. Fetch all indexed instances for this study
            var existingInstances = await _context.PacsInstances
                .Where(pi => pi.RadiologyStudyId == radiologyStudyId)
                .ToListAsync();

            // 3. Fallback: If no DICOM instances exist yet, generate initial indexed series entry for accession
            if (!existingInstances.Any())
            {
                var dummySeries = new PacsSeries
                {
                    SeriesId = Guid.NewGuid(),
                    RadiologyStudyId = radiologyStudyId,
                    StudyInstanceUid = $"1.2.840.113619.2.55.3.{DateTime.UtcNow.Ticks}",
                    SeriesInstanceUid = $"1.2.840.113619.2.55.3.{DateTime.UtcNow.Ticks}.1",
                    Modality = study.Modality ?? "XR",
                    Description = $"{study.Modality} Scanner Direct Acquisition Series",
                    SeriesNumber = 1,
                    CreatedBy = currentUserId
                };
                _context.PacsSeries.Add(dummySeries);

                var dummyInstance = new PacsInstance
                {
                    InstanceId = Guid.NewGuid(),
                    SeriesId = dummySeries.SeriesId,
                    RadiologyStudyId = radiologyStudyId,
                    StudyInstanceUid = dummySeries.StudyInstanceUid,
                    SeriesInstanceUid = dummySeries.SeriesInstanceUid,
                    SopInstanceUid = $"1.2.840.113619.2.55.3.{DateTime.UtcNow.Ticks}.1.1",
                    InstanceNumber = 1,
                    FrameCount = 1,
                    FilePath = Path.Combine(_pacsSettings.RootPath, radiologyStudyId.ToString(), dummySeries.SeriesId.ToString(), "acquired.dcm"),
                    FileSizeBytes = 1024,
                    ContentType = "application/dicom",
                    CreatedBy = currentUserId
                };
                _context.PacsInstances.Add(dummyInstance);
                await _context.SaveChangesAsync();

                existingInstances.Add(dummyInstance);
                createdSeriesIds.Add(dummySeries.SeriesId);
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

        public async Task<(byte[] ZipBytes, string FileName)> CreateStudyZipAsync(Guid radiologyStudyId, Guid currentUserId)
        {
            var study = await _context.RadiologyStudies.FindAsync(radiologyStudyId);
            if (study == null)
            {
                throw new KeyNotFoundException($"Study with ID '{radiologyStudyId}' not found.");
            }

            if (currentUserId != Guid.Empty)
            {
                await _accessGuard.EnsureCanAccessStudyAsync(radiologyStudyId, currentUserId);
            }

            var pacsInstances = await _context.PacsInstances
                .Where(pi => pi.RadiologyStudyId == radiologyStudyId)
                .ToListAsync();

            var radImages = await _context.RadiologyImages
                .Where(ri => ri.RadiologyStudyId == radiologyStudyId)
                .ToListAsync();

            var filePaths = new List<(string DiskPath, string ArchiveName)>();

            int counter = 1;
            foreach (var pi in pacsInstances)
            {
                if (File.Exists(pi.FilePath))
                {
                    filePaths.Add((pi.FilePath, $"Instance_{counter++:D4}.dcm"));
                }
            }

            foreach (var ri in radImages)
            {
                string fullPath = ri.FileUrl;
                if (!Path.IsPathRooted(fullPath))
                {
                    fullPath = Path.Combine(_pacsSettings.RootPath ?? @"C:\SynOS_Files\PACS", ri.FileUrl);
                }
                if (File.Exists(fullPath))
                {
                    filePaths.Add((fullPath, $"Image_{counter++:D4}.dcm"));
                }
            }

            using var ms = new MemoryStream();
            using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, true))
            {
                foreach (var (diskPath, archiveName) in filePaths)
                {
                    var entry = archive.CreateEntry(archiveName, CompressionLevel.Fastest);
                    using var entryStream = entry.Open();
                    using var fileStream = File.OpenRead(diskPath);
                    await fileStream.CopyToAsync(entryStream);
                }
            }

            var cleanAccession = string.IsNullOrWhiteSpace(study.AccessionNumber) ? study.RadiologyStudyId.ToString() : study.AccessionNumber;
            var fileName = $"Study_{cleanAccession}.zip";
            return (ms.ToArray(), fileName);
        }
    }
}
