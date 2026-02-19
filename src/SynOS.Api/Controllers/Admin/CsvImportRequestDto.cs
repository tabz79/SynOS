using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.Admin
{
    public class CsvImportRequestDto
    {
        [Required]
        public IFormFile? File { get; set; }
    }
}
