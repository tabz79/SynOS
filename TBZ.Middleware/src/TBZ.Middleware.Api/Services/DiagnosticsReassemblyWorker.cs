using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class DiagnosticsReassemblyWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DiagnosticsReassemblyWorker> _logger;
        private DateTime _lastPurgeTime = DateTime.MinValue;

        public DiagnosticsReassemblyWorker(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<DiagnosticsReassemblyWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("DiagnosticsReassemblyWorker starting background reassembly execution.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPendingBundlesAsync(stoppingToken);
                    await RunPeriodicPurgeAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred in DiagnosticsReassemblyWorker execution loop.");
                }

                await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            }
        }

        private async Task ProcessPendingBundlesAsync(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MiddlewareDbContext>();

            // Find bundles that are in Processing state and have received all chunks
            var pendingBundles = await db.DiagnosticsBundles
                .Where(b => b.Status == "Processing" && b.ReceivedChunks >= b.TotalChunks)
                .ToListAsync(stoppingToken);

            if (pendingBundles.Count == 0) return;

            var encryptionKey = _configuration["Diagnostics:EncryptionKey"] ?? "TBZ-DIAGNOSTICS-KEY-12345-67890";

            foreach (var bundle in pendingBundles)
            {
                _logger.LogInformation("Starting reassembly of diagnostic bundle {BundleId} (Total Chunks: {TotalChunks})", bundle.Id, bundle.TotalChunks);

                try
                {
                    var bundleIdStr = bundle.Id.ToString().ToLowerInvariant();

                    // Get chunks from StoredEvents
                    var chunksInDb = await db.StoredEvents
                        .Where(e => e.EventType == "DiagnosticsBundleChunk" && e.AggregateId == bundleIdStr)
                        .ToListAsync(stoppingToken);

                    // Parse and sort by ChunkIndex in memory
                    var parsedChunks = chunksInDb.Select(c =>
                    {
                        using var doc = JsonDocument.Parse(c.PayloadJson);
                        var root = doc.RootElement;
                        return new
                        {
                            Index = root.GetProperty("ChunkIndex").GetInt32(),
                            Data = root.GetProperty("ChunkData").GetString() ?? string.Empty,
                            EventRecord = c
                        };
                    })
                    .OrderBy(c => c.Index)
                    .ToList();

                    if (parsedChunks.Count != bundle.TotalChunks)
                    {
                        throw new InvalidOperationException($"Chunk count mismatch. Database has {parsedChunks.Count} chunks, expected {bundle.TotalChunks}.");
                    }

                    // 1. Reassemble base64 and decode to binary
                    var fullBase64 = string.Concat(parsedChunks.Select(c => c.Data));
                    var encryptedBytes = Convert.FromBase64String(fullBase64);

                    // 2. Decrypt using AES-256 GCM-like shared key configuration
                    var keyBytes = SHA256.HashData(Encoding.UTF8.GetBytes(encryptionKey));
                    var iv = new byte[16];
                    Array.Copy(keyBytes, iv, 16);

                    byte[] decryptedBytes;
                    using (var aes = Aes.Create())
                    {
                        aes.Key = keyBytes;
                        aes.IV = iv;

                        using var msInput = new MemoryStream(encryptedBytes);
                        using var msOutput = new MemoryStream();
                        using (var decryptor = aes.CreateDecryptor())
                        using (var cryptoStream = new CryptoStream(msInput, decryptor, CryptoStreamMode.Read))
                        {
                            await cryptoStream.CopyToAsync(msOutput, stoppingToken);
                        }
                        decryptedBytes = msOutput.ToArray();
                    }

                    // 3. Staging and folder extraction
                    var stagingDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "diagnostics-bundles");
                    Directory.CreateDirectory(stagingDir);

                    var zipPath = Path.Combine(stagingDir, $"{bundle.Id}.zip");
                    await File.WriteAllBytesAsync(zipPath, decryptedBytes, stoppingToken);

                    var extractPath = Path.Combine(stagingDir, bundle.Id.ToString());
                    if (Directory.Exists(extractPath))
                    {
                        Directory.Delete(extractPath, true);
                    }
                    ZipFile.ExtractToDirectory(zipPath, extractPath);

                    // 4. Calculate checksum and size of decrypted archive
                    var bundleSizeBytes = decryptedBytes.Length;
                    var checksumSha256 = ComputeSha256(decryptedBytes);

                    // 5. Update bundle record to Ready
                    bundle.Status = "Ready";
                    bundle.FolderPath = extractPath;
                    bundle.BundleSizeBytes = bundleSizeBytes;
                    bundle.ChecksumSha256 = checksumSha256;
                    bundle.CompletedAt = DateTime.UtcNow;
                    bundle.ErrorMessage = null;

                    // Delete the error flag file if it exists from previous attempts
                    var errorFlagFile = Path.Combine(stagingDir, $"{bundle.Id}.failed");
                    if (File.Exists(errorFlagFile))
                    {
                        File.Delete(errorFlagFile);
                    }

                    // 6. Mark chunks as processed in Event Store
                    foreach (var chunk in parsedChunks)
                    {
                        chunk.EventRecord.EventType = "DiagnosticsBundleChunkProcessed";
                    }

                    _logger.LogInformation("Successfully reassembled and decrypted diagnostic bundle {BundleId}. Size: {Size} bytes, Checksum: {Checksum}", bundle.Id, bundleSizeBytes, checksumSha256);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to reassemble diagnostic bundle {BundleId}", bundle.Id);

                    bundle.Status = "Failed";
                    bundle.ErrorMessage = ex.Message;
                    bundle.CompletedAt = DateTime.UtcNow;

                    // Mark chunks as processed so we don't loop endlessly on error
                    try
                    {
                        var bundleIdStr = bundle.Id.ToString().ToLowerInvariant();
                        var chunksInDb = await db.StoredEvents
                            .Where(e => e.EventType == "DiagnosticsBundleChunk" && e.AggregateId == bundleIdStr)
                            .ToListAsync(stoppingToken);

                        foreach (var chunk in chunksInDb)
                        {
                            chunk.EventType = "DiagnosticsBundleChunkProcessed";
                        }

                        // Write error flag file on disk
                        var stagingDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "diagnostics-bundles");
                        Directory.CreateDirectory(stagingDir);
                        var errorFlagFile = Path.Combine(stagingDir, $"{bundle.Id}.failed");
                        await File.WriteAllTextAsync(errorFlagFile, ex.ToString(), stoppingToken);
                    }
                    catch (Exception cleanupEx)
                    {
                        _logger.LogError(cleanupEx, "Failed to mark failed bundle {BundleId} chunks as processed.", bundle.Id);
                    }
                }

                await db.SaveChangesAsync(stoppingToken);
            }
        }

        private async Task RunPeriodicPurgeAsync(CancellationToken stoppingToken)
        {
            // Execute purge once every 24 hours
            if (DateTime.UtcNow - _lastPurgeTime < TimeSpan.FromDays(1)) return;

            _logger.LogInformation("Starting periodic purge task for processed diagnostics chunks and folder bundles older than 30 days.");

            try
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<MiddlewareDbContext>();

                var thresholdDate = DateTime.UtcNow.AddDays(-30);

                // 1. Purge database records
                var oldChunks = await db.StoredEvents
                    .Where(e => e.EventType == "DiagnosticsBundleChunkProcessed" && e.OccurredAt < thresholdDate)
                    .ToListAsync(stoppingToken);

                if (oldChunks.Count > 0)
                {
                    db.StoredEvents.RemoveRange(oldChunks);
                    await db.SaveChangesAsync(stoppingToken);
                    _logger.LogInformation("Purged {Count} processed diagnostic chunks older than 30 days from Event Store.", oldChunks.Count);
                }

                // 2. Purge files on disk
                var stagingDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "diagnostics-bundles");
                if (Directory.Exists(stagingDir))
                {
                    var oldBundles = await db.DiagnosticsBundles
                        .Where(b => b.CreatedAt < thresholdDate)
                        .ToListAsync(stoppingToken);

                    foreach (var bundle in oldBundles)
                    {
                        var zipPath = Path.Combine(stagingDir, $"{bundle.Id}.zip");
                        var folderPath = Path.Combine(stagingDir, bundle.Id.ToString());
                        var flagPath = Path.Combine(stagingDir, $"{bundle.Id}.failed");

                        try
                        {
                            if (File.Exists(zipPath)) File.Delete(zipPath);
                            if (File.Exists(flagPath)) File.Delete(flagPath);
                            if (Directory.Exists(folderPath)) Directory.Delete(folderPath, true);
                        }
                        catch (Exception fileEx)
                        {
                            _logger.LogWarning(fileEx, "Failed to delete old diagnostic bundle files for {BundleId}", bundle.Id);
                        }
                    }
                }

                _lastPurgeTime = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute periodic diagnostics purge task.");
            }
        }

        private static string ComputeSha256(byte[] data)
        {
            var hash = SHA256.HashData(data);
            return Convert.ToHexString(hash).ToLowerInvariant();
        }
    }
}
