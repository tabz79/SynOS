using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    /// <summary>
    /// Represents the global branding and identity of the Laboratory.
    /// GPT-5 Mandate: Single Source of Truth for Document Branding.
    /// </summary>
    public class LabProfile
    {
        [Key]
        public Guid LabProfileId { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(200)]
        public string Name { get; set; } = "SynOS Laboratory";

        public string? Tagline { get; set; }

        [Required]
        public string Address { get; set; } = string.Empty;

        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? Phone { get; set; }

        public string? Accreditation { get; set; } // e.g., "NABL ACCREDITED LAB (MC-1234)"
        
        public string? HeaderLogoUrl { get; set; }
        public string? WatermarkUrl { get; set; }

        public string? FooterDisclaimer { get; set; } // e.g., "* Clinical correlation required"

        // Document Branding Settings
        public int HeaderHeightMm { get; set; } = 40;
        public int FooterMarginMm { get; set; } = 15;
        public bool ShowWatermark { get; set; } = true;
        public bool ShowHeaderOnReports { get; set; } = true;
        public bool ShowDigitalSignatures { get; set; } = true;

        // Invoice Configurations
        [StringLength(20)]
        public string InvoicePrefix { get; set; } = "INV-";
        public int NextInvoiceNumber { get; set; } = 1001;
        [Column(TypeName = "decimal(5, 2)")]
        public decimal DefaultTaxPercent { get; set; } = 0;
        public bool EnableQrPayment { get; set; } = false;
        [StringLength(100)]
        public string? UpiId { get; set; }

        // SMS/WhatsApp Settings
        [StringLength(50)]
        public string? SmsGatewayProvider { get; set; }
        [StringLength(200)]
        public string? SmsApiKey { get; set; }
        [StringLength(200)]
        public string? WhatsAppGatewayUrl { get; set; }
        [StringLength(200)]
        public string? WhatsAppApiKey { get; set; }

        // SMTP Credentials
        [StringLength(100)]
        public string? SmtpHost { get; set; }
        public int SmtpPort { get; set; } = 587;
        [StringLength(100)]
        public string? SmtpUsername { get; set; }
        [StringLength(100)]
        public string? SmtpPassword { get; set; }
        public bool SmtpEnableSsl { get; set; } = true;
        [StringLength(100)]
        public string? SmtpSenderEmail { get; set; }
        [StringLength(100)]
        public string? SmtpSenderName { get; set; }

        // Automatic Database Backup Rules
        public bool BackupEnabled { get; set; } = false;
        [StringLength(50)]
        public string? BackupFrequency { get; set; } = "Daily"; // Daily, Weekly, Monthly
        [StringLength(10)]
        public string? BackupTime { get; set; } = "02:00"; // HH:mm
        [StringLength(500)]
        public string? BackupPath { get; set; }

        [Required]
        [StringLength(100)]
        public string OperatingRegion { get; set; } = "Khammam";

        [Required]
        [StringLength(100)]
        public string LabCity { get; set; } = "Khammam";

        [Required]
        [StringLength(20)]
        public string LabPincode { get; set; } = "507001";

        public string? MiddlewareApiUrl { get; set; }
        public string? MiddlewareApiKey { get; set; }
        [StringLength(50)]
        public string LabId { get; set; } = "LAB001";
        public string? LicenseType { get; set; }
        public int MaximumBranches { get; set; } = 1;
        public DateTime? LicenseExpiryDate { get; set; }
        public string? LicenseStatus { get; set; }
        public System.Collections.Generic.List<string> EnabledFeatures { get; set; } = new();
        public string? BackupEncryptionKey { get; set; }
        public string? DiagnosticsEncryptionKey { get; set; }
        public int PacsMaxInstancesPerSeriesInSeriesTree { get; set; } = 5000;
        public int PacsMaxTotalInstancesPerStudyInSeriesTree { get; set; } = 20000;
        public bool ReferralEconomicsEnabled { get; set; } = true;
        public string? InventoryValuationMethod { get; set; } = "FIFO";

        // New Operational Paths
        public string? ReportStorageFolder { get; set; }
        public string? WorkingDirectory { get; set; }

        // JWT Session Expiration
        public int JwtExpiryMinutes { get; set; } = 1440;
        public int JwtRefreshTokenExpiryDays { get; set; } = 7;

        // OTA Update Configurations
        public string? OtaChannel { get; set; } = "Stable"; // Stable, Beta, Canary
        public string? OtaPolicy { get; set; } = "NotifyOnly"; // Manual, NotifyOnly, Automatic
        public string? MaintenanceDay { get; set; } = "Sunday";
        public string? MaintenanceStartHour { get; set; } = "02:00";
        public string? MaintenanceEndHour { get; set; } = "04:00";

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
