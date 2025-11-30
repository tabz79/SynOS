namespace SynOS.Models.DTOs.ReportTemplateDsl
{
    public class HeaderConfig
    {
        public string Title { get; set; } = "Report";
        public bool ShowLogo { get; set; } = true;
    }

    public class PatientInfoConfig
    {
        public bool ShowPatientName { get; set; } = true;
        public bool ShowPatientId { get; set; } = true;
        public bool ShowDateOfBirth { get; set; } = true;
        public bool ShowGender { get; set; } = true;
        public bool ShowContactInfo { get; set; } = true;
    }

    public class ParameterTableConfig
    {
        public bool ShowReferenceRanges { get; set; } = true;
        public bool HighlightCriticalValues { get; set; } = true;
    }

    public class CommentsConfig
    {
        public string Title { get; set; } = "Comments";
        public bool VisibleIfEmpty { get; set; } = false;
    }

    public class InterpretationConfig
    {
        public string Title { get; set; } = "Interpretation";
        public bool VisibleIfEmpty { get; set; } = false;
    }

    public class RecommendationsConfig
    {
        public string Title { get; set; } = "Recommendations";
        public bool VisibleIfEmpty { get; set; } = false;
    }

    public class SignatureBlockConfig
    {
        public bool ShowDoctorName { get; set; } = true;
        public bool ShowCredentials { get; set; } = true;
        public bool ShowDigitalSignatureImage { get; set; } = true;
    }

    public class QRCodeConfig
    {
        public int Size { get; set; } = 50;
        public string Content { get; set; } = "{ReportVerificationLink}";
    }

    public class FooterConfig
    {
        public string LeftText { get; set; } = "SynOS Diagnostic Lab";
        public string RightText { get; set; } = "Page {PageNumber} of {TotalPages}";
    }
}
