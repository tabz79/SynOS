namespace SynOS.Models.DTOs.ReportTemplateDsl
{
    public class HeaderConfig
    {
        public string Title { get; set; } = "Report";
        public bool ShowLogo { get; set; } = true;

        public bool? UsePreprinted { get; set; }
        public float? TopMargin { get; set; }
        public float? LeftRightMargin { get; set; }
        public float? BottomMargin { get; set; }
        public string? BgType { get; set; }
        public string? BackgroundPath { get; set; }
        public double? BgImageOpacity { get; set; }
        public string? BgColor { get; set; }
        public string? BgGradientStart { get; set; }
        public string? BgGradientEnd { get; set; }
        public double? BgGradientAngle { get; set; }

        public bool? IncludeBranding { get; set; }
        public bool? IncludeLogo { get; set; }
        public bool? IncludeHeaderName { get; set; }
        public bool? IncludeHeaderSubtitle { get; set; }
        public bool? ShowHeaderDivider { get; set; }
        public string? HeaderDividerColor { get; set; }
        public float? HeaderDividerThickness { get; set; }
    }

    public class PatientInfoConfig
    {
        public bool ShowPatientName { get; set; } = true;
        public bool ShowPatientId { get; set; } = true;
        public bool ShowDateOfBirth { get; set; } = true;
        public bool ShowGender { get; set; } = true;
        public bool ShowContactInfo { get; set; } = true;

        public bool? EnableAbsolutePositioning { get; set; }
        public float? PatientBlockY { get; set; }
        public float? PatientNameX { get; set; }
        public float? PatientNameY { get; set; }
        public float? PatientAgeSexX { get; set; }
        public float? PatientAgeSexY { get; set; }
        public float? RefDoctorX { get; set; }
        public float? RefDoctorY { get; set; }
        public float? PatientIdX { get; set; }
        public float? PatientIdY { get; set; }
        public float? BillingDateX { get; set; }
        public float? BillingDateY { get; set; }
        public float? ReportDateX { get; set; }
        public float? ReportDateY { get; set; }
    }

    public class ReportColumnDefinition
    {
        public string Code { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int Weight { get; set; } = 1;
        public string Alignment { get; set; } = "Left";
        public bool Bold { get; set; }
    }

    public class ParameterTableConfig
    {
        public bool ShowReferenceRanges { get; set; } = true;
        public bool HighlightCriticalValues { get; set; } = true;
        public System.Collections.Generic.List<string>? VisibleColumns { get; set; }
        public System.Collections.Generic.List<int>? ColumnWeights { get; set; }
        public System.Collections.Generic.List<ReportColumnDefinition>? Columns { get; set; }

        public float? TableBlockY { get; set; }
        public float? TestTitleX { get; set; }
        public float? TestTitleY { get; set; }
        public float? ResultsTableX { get; set; }
        public float? ResultsTableY { get; set; }
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

        public float? SignatureBlockY { get; set; }
        public float? SignatureX { get; set; }
        public float? SignatureY { get; set; }
        public bool? IncludeSignatures { get; set; }
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
