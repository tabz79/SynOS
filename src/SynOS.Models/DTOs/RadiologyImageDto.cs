using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class RadiologyImageDto
    {
        public Guid ImageId { get; set; }
        public Guid RadiologyStudyId { get; set; }
        public string FileName { get; set; }
        public string FileUrl { get; set; }
        public string ViewLabel { get; set; }
        public int? SeriesNumber { get; set; }
        public int? SequenceNumber { get; set; }
        public string? StudyInstanceUid { get; set; }
        public string? SeriesInstanceUid { get; set; }
        public string? SopInstanceUid { get; set; }
        public DateTimeOffset UploadedAt { get; set; }
        public string UploaderName { get; set; }
    }
}
