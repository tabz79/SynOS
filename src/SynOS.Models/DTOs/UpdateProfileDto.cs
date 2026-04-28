// File: src/SynOS.Models/DTOs/UpdateProfileDto.cs
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class UpdateProfileDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        public string? Designation { get; set; }
    }
}
