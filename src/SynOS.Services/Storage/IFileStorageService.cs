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

        /// <summary>
        /// Retrieves the public URL for a given file path.
        /// </summary>
        /// <param name="filePath">The internal file path.</param>
        /// <returns>The publicly accessible URL of the file.</returns>
        string GetFileUrl(string filePath);

        /// <summary>
        /// Retrieves a file as a Stream for download.
        /// </summary>
        /// <param name="filePath">The internal file path.</param>
        /// <returns>A Stream containing the file's content.</returns>
        Task<Stream> GetFileStreamAsync(string filePath);
        
        /// <summary>
        /// Saves a file from a byte array to the configured storage.
        /// </summary>
        /// <param name="data">The file content as a byte array.</param>
        /// <param name="fileName">The desired file name (including extension).</param>
        /// <param name="subDirectory">A subdirectory to store the file in.</param>
        /// <returns>The relative path of the stored file.</returns>
        Task<string> SaveFileAsync(byte[] data, string fileName, string subDirectory);
    }
}
