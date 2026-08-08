using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.Radiology
{
    public class RadiologyModalityDto
    {
        public Guid ModalityId { get; set; }
        public Guid BranchId { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = null!;

        [Required]
        [StringLength(20)]
        public string ModalityType { get; set; } = "MR"; // MR, CT, US, XR, CR, DX

        [Required]
        [StringLength(50)]
        public string AeTitle { get; set; } = null!;

        [StringLength(50)]
        public string HostIpAddress { get; set; } = "127.0.0.1";

        public int Port { get; set; } = 104;

        public bool AllowCStore { get; set; } = true;
        public bool AllowMwl { get; set; } = true;
        public bool IsActive { get; set; } = true;
        public string? Notes { get; set; }
    }

    public class CreateRadiologyModalityDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = null!;

        [Required]
        [StringLength(20)]
        public string ModalityType { get; set; } = "MR";

        [Required]
        [StringLength(50)]
        public string AeTitle { get; set; } = null!;

        [StringLength(50)]
        public string HostIpAddress { get; set; } = "127.0.0.1";

        public int Port { get; set; } = 104;

        public bool AllowCStore { get; set; } = true;
        public bool AllowMwl { get; set; } = true;
        public string? Notes { get; set; }
    }
}
