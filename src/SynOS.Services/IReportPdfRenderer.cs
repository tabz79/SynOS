using System.Threading.Tasks;
using SynOS.Models.DTOs.ReportTemplateDsl;

namespace SynOS.Services
{
    // Placeholder for data model that QuestPDF will use
    public class ReportDataModel // This needs to be defined based on actual report data structure
    {
        public string Modality { get; set; } = string.Empty;
        public string ReportTitle { get; set; } = "Diagnostic Report";
        public PatientInfo Patient { get; set; } = new PatientInfo();
        public List<ParameterResult> Parameters { get; set; } = new List<ParameterResult>();
        public string Comments { get; set; } = string.Empty;
        public string Interpretation { get; set; } = string.Empty;
        public string Recommendations { get; set; } = string.Empty;
        public SignatureDetails Signature { get; set; } = new SignatureDetails();
        public string VerificationQrCodeContent { get; set; } = string.Empty;
        public int ReportVersion { get; set; }
        public string? SignatureHash { get; set; }
        public DateTimeOffset? SignedAt { get; set; }
        // Add other necessary data fields
    }

    public class PatientInfo
    {
        public string Name { get; set; } = string.Empty;
        public string PatientId { get; set; } = string.Empty;
        public string DateOfBirth { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string ContactInfo { get; set; } = string.Empty;
    }

    public class ParameterResult
    {
        public string Name { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
        public string ReferenceRange { get; set; } = string.Empty;
        public bool IsCritical { get; set; }
    }

    public class SignatureDetails
    {
        public string DoctorName { get; set; } = string.Empty;
        public string Credentials { get; set; } = string.Empty;
        public byte[]? SignatureImage { get; set; }
    }


    public interface IReportPdfRenderer
    {
        Task<byte[]> GeneratePdfAsync(ReportDataModel data, TemplateModel templateModel);
    }
}
