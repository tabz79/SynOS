using System.Collections.Generic;

namespace SynOS.Models.DTOs.Admin
{
    public class CsvImportResultDto
    {
        public int SuccessCount { get; set; }
        public int ErrorCount { get; set; }
        public List<string> Errors { get; set; } = new();
        public List<RowResult> RowResults { get; set; } = new();
    }

    public class RowResult
    {
        public int RowNumber { get; set; }
        public string TestCode { get; set; }
        public bool Success { get; set; }
        public string Message { get; set; }
    }
}
