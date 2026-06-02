using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;

namespace SynOS.Services.Storage
{
    public class RadiologyImageSourceService : IRadiologyImageSourceService
    {
        private readonly SynOSDbContext _context;
        private readonly IFileStorageService _fileStorageService;

        public RadiologyImageSourceService(SynOSDbContext context, IFileStorageService fileStorageService)
        {
            _context = context;
            _fileStorageService = fileStorageService;
        }

        public string ResolveImageId(Guid imageId)
        {
            // Abstraction placeholder: maps a Guid image ID to internal locator reference
            return imageId.ToString();
        }

        public string GetImageWadoUrl(Guid imageId)
        {
            // Safe URL resolution: gets raw .dcm file and resolves it via static file server
            // In a future phase, this can seamlessly transition to a WADO-RS Orthanc proxy
            var image = _context.RadiologyImages.Find(imageId);
            if (image == null)
            {
                throw new KeyNotFoundException($"Radiology image with ID '{imageId}' not found.");
            }

            // Maps relative storage path to fully qualified public static file URL
            return _fileStorageService.GetFileUrl(image.FileUrl);
        }

        public async Task<Stream> GetImageStreamAsync(Guid imageId)
        {
            var image = await _context.RadiologyImages.FindAsync(imageId);
            if (image == null)
            {
                throw new KeyNotFoundException($"Radiology image with ID '{imageId}' not found.");
            }

            return await _fileStorageService.GetFileStreamAsync(image.FileUrl);
        }
    }
}
