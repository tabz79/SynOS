using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using SynOS.Models.DTOs.Admin;

namespace SynOS.Services
{
    public interface ICatalogImportService
    {
        Task<CatalogImportResultDto> ImportCatalogAsync(Stream fileStream, Guid actorUserId, bool validateOnly, CancellationToken cancellationToken);
        Task<CatalogImportResultDto> ImportCatalogAsync(IFormFile file, Guid actorUserId, bool validateOnly, CancellationToken cancellationToken);
    }
}
