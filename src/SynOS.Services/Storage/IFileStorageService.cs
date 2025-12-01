// File: src/SynOS.Services/Storage/IFileStorageService.cs
// Author: Gemini
// Date: 2025-11-30

using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace SynOS.Services.Storage
{
    public interface IFileStorageService
    {
        /// <summary>
        /// Saves a file to the configured storage.
        /// </summary>
        /// <param name="file">The file to save.</param>
        /// <param name="allowedMimeTypes">A collection of allowed MIME types.</param>
        /// <param name="maxSizeInBytes">The maximum allowed file size in bytes.</param>
        /// <param name="subDirectory">A subdirectory to store the file in (e.g., "signatures").</param>
        /// <returns>The publicly accessible URL or internal path of the stored file.</returns>
        Task<string> SaveFileAsync(IFormFile file, ICollection<string> allowedMimeTypes, long maxSizeInBytes, string subDirectory);
    }
}
