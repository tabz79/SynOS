using FellowOakDicom;
using System;
using System.IO;
using System.Threading.Tasks;

namespace SynOS.Services.DICOM
{
    public static class DicomMetadataExtractor
    {
        public static async Task<DicomMetadata> ParseAsync(Stream fileStream)
        {
            var dicomFile = await DicomFile.OpenAsync(fileStream, FileReadOption.ReadAll);
            var dataset = dicomFile.Dataset;

            var studyUid = GetSafeString(dataset, DicomTag.StudyInstanceUID);
            var seriesUid = GetSafeString(dataset, DicomTag.SeriesInstanceUID);
            var sopUid = GetSafeString(dataset, DicomTag.SOPInstanceUID);

            if (string.IsNullOrWhiteSpace(studyUid))
            {
                studyUid = DicomUID.Generate().UID;
            }

            if (string.IsNullOrWhiteSpace(seriesUid))
            {
                seriesUid = DicomUID.Generate().UID;
            }

            if (string.IsNullOrWhiteSpace(sopUid))
            {
                sopUid = DicomUID.Generate().UID;
            }

            return new DicomMetadata
            {
                StudyInstanceUid = studyUid,
                SeriesInstanceUid = seriesUid,
                SopInstanceUid = sopUid,
                Modality = GetSafeString(dataset, DicomTag.Modality) ?? "XR",
                SeriesDescription = GetSafeString(dataset, DicomTag.SeriesDescription) ?? "Radiology Series",
                SeriesNumber = GetSafeInt(dataset, DicomTag.SeriesNumber) ?? 1,
                InstanceNumber = GetSafeInt(dataset, DicomTag.InstanceNumber) ?? 1,
                FrameCount = GetSafeInt(dataset, DicomTag.NumberOfFrames) ?? 1,
                ImagePositionPatient = GetSafeString(dataset, DicomTag.ImagePositionPatient),
                ImageOrientationPatient = GetSafeString(dataset, DicomTag.ImageOrientationPatient),
                PixelSpacing = GetSafeString(dataset, DicomTag.PixelSpacing)
            };
        }

        private static string GetSafeString(DicomDataset dataset, DicomTag tag)
        {
            try
            {
                if (!dataset.Contains(tag)) return null;
                return dataset.GetString(tag);
            }
            catch
            {
                try
                {
                    return dataset.GetSingleValueOrDefault(tag, (string)null);
                }
                catch
                {
                    return null;
                }
            }
        }

        private static int? GetSafeInt(DicomDataset dataset, DicomTag tag)
        {
            try
            {
                if (!dataset.Contains(tag)) return null;
                var strVal = dataset.GetString(tag);
                if (int.TryParse(strVal, out var parsed)) return parsed;
                return dataset.GetSingleValueOrDefault<int?>(tag, null);
            }
            catch
            {
                return null;
            }
        }
    }

    public class DicomValidationException : System.Exception
    {
        public DicomValidationException(string message) : base(message) { }
    }
}
