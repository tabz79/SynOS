using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.Admin
{
    public class CatalogImportResultDto
    {
        public bool Success { get; set; }
        public int SuccessCount { get; set; }
        public int NewInsertedCount { get; set; }
        public int UpdatedCount { get; set; }
        public int ErrorCount { get; set; }
        public List<string> GlobalErrors { get; set; } = new();
        public List<RowLevelError> RowLevelErrors { get; set; } = new();
    }

    public class RowLevelError
    {
        public string SheetName { get; set; }
        public int RowNumber { get; set; }
        public string ErrorMessage { get; set; }
    }

    public class CatalogImportRequestDto
    {
        public Microsoft.AspNetCore.Http.IFormFile File { get; set; }
        public bool? ValidateOnly { get; set; } = false;
    }
}
