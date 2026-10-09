using System;
using System.IO;
using System.Net;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Services;
using tusdotnet;
using tusdotnet.Interfaces;
using tusdotnet.Models;
using tusdotnet.Models.Configuration;
using tusdotnet.Stores;

namespace SynOS.Api.Configuration
{
    public static class TusDicomConfiguration
    {
        public static IApplicationBuilder UseDicomTusUpload(this IApplicationBuilder app)
        {
            var tempUploadPath = Path.Combine(Path.GetTempPath(), "SynOS_TusUploads");
            if (!Directory.Exists(tempUploadPath))
            {
                Directory.CreateDirectory(tempUploadPath);
            }

            app.UseTus(httpContext => new DefaultTusConfiguration
            {
                Store = new TusDiskStore(tempUploadPath),
                UrlPath = "/api/v1/radiology/pacs/upload-tus",
                Events = new Events
                {
                    OnAuthorizeAsync = ctx =>
                    {
                        var authHeader = ctx.HttpContext.Request.Headers["Authorization"].ToString();
                        if (string.IsNullOrWhiteSpace(authHeader) && ctx.HttpContext.User?.Identity?.IsAuthenticated != true)
                        {
                            ctx.FailRequest(HttpStatusCode.Unauthorized, "Authorization token is required for upload.");
                        }
                        return Task.CompletedTask;
                    },
                    OnBeforeCreateAsync = async ctx =>
                    {
                        var metadata = ctx.Metadata;
                        if (!metadata.TryGetValue("radiologyStudyId", out var studyIdMeta))
                        {
                            ctx.FailRequest(HttpStatusCode.BadRequest, "radiologyStudyId metadata is required.");
                            return;
                        }

                        var studyIdStr = studyIdMeta.GetString(Encoding.UTF8);
                        if (!Guid.TryParse(studyIdStr, out var studyId))
                        {
                            ctx.FailRequest(HttpStatusCode.BadRequest, "Invalid radiologyStudyId GUID format.");
                            return;
                        }

                        using var scope = ctx.HttpContext.RequestServices.CreateScope();
                        var dbContext = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                        var studyExists = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(
                            dbContext.RadiologyStudies, s => s.RadiologyStudyId == studyId);

                        if (!studyExists)
                        {
                            ctx.FailRequest(HttpStatusCode.NotFound, $"Radiology study {studyId} not found.");
                            return;
                        }
                    },
                    OnFileCompleteAsync = async ctx =>
                    {
                        var file = await ctx.GetFileAsync();
                        var metadata = await file.GetMetadataAsync(ctx.CancellationToken);

                        var studyIdStr = metadata.TryGetValue("radiologyStudyId", out var sMeta) ? sMeta.GetString(Encoding.UTF8) : null;
                        var fileName = metadata.TryGetValue("filename", out var fMeta) ? fMeta.GetString(Encoding.UTF8) : $"{file.Id}.zip";

                        if (!Guid.TryParse(studyIdStr, out var studyId))
                        {
                            return;
                        }

                        var userIdStr = ctx.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                                        ?? ctx.HttpContext.User.FindFirst("sub")?.Value;
                        Guid.TryParse(userIdStr, out var currentUserId);

                        using var scope = ctx.HttpContext.RequestServices.CreateScope();
                        var pacsService = scope.ServiceProvider.GetRequiredService<IPacsService>();
                        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("TusDicomUpload");

                        logger.LogInformation("Tus resumable upload completed for Study {StudyId}, File: {FileName}. Starting DICOM ingestion...", studyId, fileName);

                        try
                        {
                            await using var stream = await file.GetContentAsync(ctx.CancellationToken);
                            var result = await pacsService.ImportDicomStreamEnterpriseAsync(studyId, stream, fileName, currentUserId, ctx.CancellationToken);
                            logger.LogInformation("Successfully ingested {ImportedCount} DICOM instances for Study {StudyId} via Tus upload.", result.ImagesImported, studyId);

                            var terminationStore = (ITusTerminationStore)ctx.Store;
                            await terminationStore.DeleteFileAsync(file.Id, ctx.CancellationToken);
                        }
                        catch (Exception ex)
                        {
                            logger.LogError(ex, "Failed to ingest DICOM stream for Study {StudyId} from Tus file {FileId}.", studyId, file.Id);
                            throw;
                        }
                    }
                }
            });

            return app;
        }
    }
}
