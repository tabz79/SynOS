using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using SynOS.Models.DTOs.Admin;

namespace SynOS.Services
{
    public interface ICsvService
    {
        Task<byte[]> GetTemplateCsvBytesAsync();
        Task<byte[]> ExportTestsToCsvAsync();
        Task<CsvImportResultDto> ImportTestsFromCsvAsync(Stream csvStream, Guid userId, CancellationToken cancellationToken = default);
        Task<CsvImportResultDto> ImportTestsFromExcelAsync(Stream fileStream, Guid userId, CancellationToken cancellationToken = default);
        Task<byte[]> ExportProfitabilityCsvAsync(SynOS.Models.DTOs.Economics.LabProfitabilitySummaryDto summary);
    }

    public class CsvImportResult
    {
        public int SuccessCount { get; set; }
        public int ErrorCount { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
    }
}
