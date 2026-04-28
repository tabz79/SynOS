// File: src/SynOS.Services/Storage/LocalStorageService.cs
// Author: Gemini
// Date: 2025-11-30

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace SynOS.Services.Storage
{
    public class LocalStorageService : IFileStorageService
    {
        private readonly string _basePath;
        private readonly string _publicBaseUrl;

        public LocalStorageService(IConfiguration configuration)
        {
            _basePath = configuration["FileStorage:BasePath"] ?? throw new InvalidOperationException("FileStorage:BasePath is not configured.");
            _publicBaseUrl = configuration["FileStorage:PublicBaseUrl"] ?? throw new InvalidOperationException("FileStorage:PublicBaseUrl is not configured.");

            if (!Directory.Exists(_basePath))
            {
                Directory.CreateDirectory(_basePath);
            }
        }

        public async Task<string> SaveFileAsync(IFormFile file, ICollection<string> allowedMimeTypes, long maxSizeInBytes, string subDirectory)
        {
            if (file == null || file.Length == 0)
            {
                throw new ArgumentException("File is empty.", nameof(file));
            }

            if (file.Length > maxSizeInBytes)
            {
                throw new ArgumentException($"File size exceeds the limit of {maxSizeInBytes / 1024} KB.", nameof(file));
            }

            if (!allowedMimeTypes.Contains(file.ContentType))
            {
                throw new ArgumentException($"Invalid file type. Allowed types are: {string.Join(", ", allowedMimeTypes)}.", nameof(file));
            }

            var targetDirectory = Path.Combine(_basePath, subDirectory);
            if (!Directory.Exists(targetDirectory))
            {
                Directory.CreateDirectory(targetDirectory);
            }

            var fileExtension = Path.GetExtension(file.FileName);
            var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(targetDirectory, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return the path relative to _basePath to be stored in the database
            return Path.Combine(subDirectory, uniqueFileName);
        }

        public string GetFileUrl(string relativeFilePath)
        {
            // relativeFilePath is expected to be the path returned by SaveFileAsync
            return $"{_publicBaseUrl}/{relativeFilePath}".Replace('\\', '/');
        }

        public Task<Stream> GetFileStreamAsync(string relativeFilePath)
        {
            var fullPath = Path.Combine(_basePath, relativeFilePath);
            if (!File.Exists(fullPath))
            {
                throw new FileNotFoundException($"File not found at {fullPath}", fullPath);
            }
            return Task.FromResult<Stream>(new FileStream(fullPath, FileMode.Open, FileAccess.Read));
        }

        public async Task<string> SaveFileAsync(byte[] data, string fileName, string subDirectory)
        {
            if (data == null || data.Length == 0)
            {
                throw new ArgumentException("File data is empty.", nameof(data));
            }

            var targetDirectory = Path.Combine(_basePath, subDirectory);
            if (!Directory.Exists(targetDirectory))
            {
                Directory.CreateDirectory(targetDirectory);
            }
            
            // Note: In a real-world scenario, you might want to sanitize the fileName.
            var filePath = Path.Combine(targetDirectory, fileName);

            await File.WriteAllBytesAsync(filePath, data);

            // Return the path relative to _basePath
            return Path.Combine(subDirectory, fileName).Replace('\\', '/');
        }

        public Task DeleteFileAsync(string relativePath)
        {
            try
            {
                if (string.IsNullOrEmpty(relativePath)) return Task.CompletedTask;

                var fullPath = Path.Combine(_basePath, relativePath);
                if (File.Exists(fullPath))
                {
                    File.Delete(fullPath);
                }
            }
            catch (Exception ex)
            {
                // Deletion is elective cleanup; we log but don't fail the main process
                // _logger.LogWarning(ex, "Failed to delete file at {Path}", relativePath);
            }

            return Task.CompletedTask;
        }
    }
}
