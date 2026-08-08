using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class RadiologyModality : BaseEntity
    {
        [Key]
        public Guid ModalityId { get; set; } = Guid.NewGuid();

        public Guid BranchId { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = null!; // e.g. GE Signa 1.5T MRI, Siemens Somatom CT

        [Required]
        [StringLength(20)]
        public string ModalityType { get; set; } = "MR"; // MR, CT, US, XR, CR, DX

        [Required]
        [StringLength(50)]
        public string AeTitle { get; set; } = null!; // Remote Application Entity Title e.g. GE_MRI_01

        [StringLength(50)]
        public string HostIpAddress { get; set; } = "127.0.0.1"; // Scanner IP address

        public int Port { get; set; } = 104; // Scanner DICOM Port

        public bool AllowCStore { get; set; } = true; // Permitted to push images to SynOS PACS
        public bool AllowMwl { get; set; } = true; // Permitted to query DICOM Modality Worklist
        public bool IsActive { get; set; } = true;

        [StringLength(250)]
        public string? Notes { get; set; }
    }
}
