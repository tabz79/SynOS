namespace SynOS.Services.DICOM
{
    public sealed class DicomMetadata
    {
        public string StudyInstanceUid { get; set; } = default!;
        public string SeriesInstanceUid { get; set; } = default!;
        public string SopInstanceUid { get; set; } = default!;
        public string? Modality { get; set; }
        public string? SeriesDescription { get; set; }
        public int? SeriesNumber { get; set; }
        public int? InstanceNumber { get; set; }
        public int? FrameCount { get; set; }
        public string? ImagePositionPatient { get; set; }
        public string? ImageOrientationPatient { get; set; }
        public string? PixelSpacing { get; set; }
    }
}
