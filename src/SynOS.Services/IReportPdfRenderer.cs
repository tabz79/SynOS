using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs.ReportTemplateDsl;

namespace SynOS.Services
{
    // Placeholder for data model that QuestPDF will use
    // --- REPORT DATA CONTRACT V2 (The Future) ---
    public class ReportDataModel
    {
        public ReportMetadata Metadata { get; set; } = new ReportMetadata();
        public LabDetails Lab { get; set; } = new LabDetails();
        public string Modality { get; set; } = string.Empty;
        public string ReportTitle { get; set; } = "Diagnostic Report";
        public PatientInfo Patient { get; set; } = new PatientInfo();
        public List<ResultGroup> Results { get; set; } = new List<ResultGroup>();
        public string Comments { get; set; } = string.Empty;
        public string Interpretation { get; set; } = string.Empty;
        public string Recommendations { get; set; } = string.Empty;
        public List<ReportSignatureDetails> Signatures { get; set; } = new List<ReportSignatureDetails>();
        public VerificationInfo Verification { get; set; } = new VerificationInfo();
    }

    public class ReportMetadata
    {
        public int ContractVersion { get; set; } = 2; // GPT-5 Rule: Versioning
        public string GeneratedFrom { get; set; } = "live"; // "live" or "snapshot"
        public bool IsDraft { get; set; } // GPT-5 Rule: Explicit status
        public DateTimeOffset? GeneratedAt { get; set; }
        public string? GeneratedAtFormatted { get; set; } // GPT-5 Rule: Backend formats dates
        public DateTimeOffset? SampleCollectedAt { get; set; }
        public string? SampleCollectedAtFormatted { get; set; }
        public DateTimeOffset? SampleReceivedAt { get; set; }
        public string? SampleReceivedAtFormatted { get; set; }
        public string? ReferenceDoctor { get; set; }
    }

    public class LabDetails
    {
        public string Name { get; set; } = "SynOS Laboratory";
        public string Subtitle { get; set; } = "Enterprise Lab Intelligence System";
        public string Address { get; set; } = string.Empty;
        public string Contact { get; set; } = string.Empty;
        public string Accreditation { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
    }

    public class ResultGroup
    {
        public string GroupName { get; set; } = string.Empty;
        public int Sequence { get; set; }
        public List<ParameterResult> Parameters { get; set; } = new List<ParameterResult>();
    }

    public class ParameterResult
    {
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty; // Legacy string value
        public string DisplayValue { get; set; } = string.Empty; // Formatted
        public double? NumericalValue { get; set; }
        public string Unit { get; set; } = string.Empty;
        public string ReferenceRangeText { get; set; } = string.Empty; // e.g. "0.1 - 1.2"
        public ReportReferenceRange? ReferenceRange { get; set; } // Structured
        public string Flag { get; set; } = string.Empty; // H | L | N | Critical
        public bool IsAbnormal { get; set; }
        public int Sequence { get; set; }
        public string? Method { get; set; }
        public string? SampleType { get; set; }
    }

    public class ReportReferenceRange
    {
        public double? Min { get; set; }
        public double? Max { get; set; }
        public string Text { get; set; } = string.Empty;
    }

    public class VerificationInfo
    {
        public string QrCodeContent { get; set; } = string.Empty;
        public int ReportVersion { get; set; }
        public string? VersionHash { get; set; }
        public string Status { get; set; } = "PENDING"; // GPT-5 Rule: Status-driven labels
    }

    // --- LEGACY MODELS (V1 compatibility) ---
    public class LegacyReportDataModel
    {
        public string Modality { get; set; } = string.Empty;
        public string ReportTitle { get; set; } = "Diagnostic Report";
        public PatientInfo Patient { get; set; } = new PatientInfo();
        public List<LegacyParameterResult> Parameters { get; set; } = new List<LegacyParameterResult>();
        public string Comments { get; set; } = string.Empty;
        public string Interpretation { get; set; } = string.Empty;
        public string Recommendations { get; set; } = string.Empty;
        public LegacySignatureDetails Signature { get; set; } = new LegacySignatureDetails();
        public string VerificationQrCodeContent { get; set; } = string.Empty;
        public int ReportVersion { get; set; }
        public string? SignatureHash { get; set; }
        public DateTimeOffset? SignedAt { get; set; }
    }

    public class LegacyParameterResult
    {
        public string Name { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
        public string ReferenceRange { get; set; } = string.Empty;
        public bool IsAbnormal { get; set; }
    }

    public class LegacySignatureDetails
    {
        public string DoctorName { get; set; } = string.Empty;
        public string Credentials { get; set; } = string.Empty;
        public byte[]? SignatureImage { get; set; }
    }

    // --- SHARED MODELS ---
    public class PatientInfo
    {
        public string Name { get; set; } = string.Empty;
        public string PatientId { get; set; } = string.Empty;
        public string DateOfBirth { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string ContactInfo { get; set; } = string.Empty;
    }

    public class ReportSignatureDetails
    {
        public string DoctorName { get; set; } = string.Empty;
        public string Credentials { get; set; } = string.Empty;
        public string Role { get; set; } = "Pathologist";
        public byte[]? SignatureImage { get; set; }
        public string? SignatureImageBase64 { get; set; }
        public DateTimeOffset? SignedAt { get; set; }
        public string? Hash { get; set; }
    }


    public interface IReportPdfRenderer
    {
        Task<byte[]> GeneratePdfAsync(ReportDataModel data, TemplateModel templateModel);
    }
}
