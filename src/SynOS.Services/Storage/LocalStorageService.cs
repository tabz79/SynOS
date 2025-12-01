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

            var publicUrl = $"{_publicBaseUrl}/{subDirectory}/{uniqueFileName}".Replace('\\', '/');
            return publicUrl;
        }
    }
}
