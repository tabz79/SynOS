using FellowOakDicom;
using System.IO;
using System.Threading.Tasks;

namespace SynOS.Services.DICOM
{
    public static class DicomMetadataExtractor
    {
        public static async Task<DicomMetadata> ParseAsync(Stream fileStream)
        {
            var dicomFile = await DicomFile.OpenAsync(fileStream);
            var dataset = dicomFile.Dataset;

            var studyUid = dataset.GetSingleValueOrDefault(DicomTag.StudyInstanceUID, string.Empty);
            var seriesUid = dataset.GetSingleValueOrDefault(DicomTag.SeriesInstanceUID, string.Empty);
            var sopUid = dataset.GetSingleValueOrDefault(DicomTag.SOPInstanceUID, string.Empty);

            if (string.IsNullOrEmpty(studyUid) || string.IsNullOrEmpty(seriesUid) || string.IsNullOrEmpty(sopUid))
            {
                throw new DicomValidationException("The DICOM file is invalid as it is missing one or more required UIDs (Study, Series, or SOP Instance).");
            }

            return new DicomMetadata
            {
                StudyInstanceUid = studyUid,
                SeriesInstanceUid = seriesUid,
                SopInstanceUid = sopUid,
                Modality = dataset.GetSingleValueOrDefault(DicomTag.Modality, (string)null),
                SeriesDescription = dataset.GetSingleValueOrDefault(DicomTag.SeriesDescription, (string)null),
                SeriesNumber = dataset.GetSingleValueOrDefault(DicomTag.SeriesNumber, (int?)null),
                InstanceNumber = dataset.GetSingleValueOrDefault(DicomTag.InstanceNumber, (int?)null),
                FrameCount = dataset.GetSingleValueOrDefault(DicomTag.NumberOfFrames, (int?)null),
                ImagePositionPatient = dataset.GetSingleValueOrDefault(DicomTag.ImagePositionPatient, (string)null),
                ImageOrientationPatient = dataset.GetSingleValueOrDefault(DicomTag.ImageOrientationPatient, (string)null),
                PixelSpacing = dataset.GetSingleValueOrDefault(DicomTag.PixelSpacing, (string)null)
            };
        }
    }

    public class DicomValidationException : System.Exception
    {
        public DicomValidationException(string message) : base(message) { }
    }
}
