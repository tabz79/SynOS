using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Services;
using SynOS.Services.Security;
using System;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/v1/admin/settings")]
    [Authorize(Roles = "Admin")]
    public class SettingsController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly IAuditService _auditService;
        private readonly IUserContext _userContext;

        public SettingsController(SynOSDbContext context, IAuditService auditService, IUserContext userContext)
        {
            _context = context;
            _auditService = auditService;
            _userContext = userContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            var profile = await _context.LabProfiles.FirstOrDefaultAsync();
            if (profile == null)
            {
                return NotFound(new { message = "Global Lab Profile settings not found." });
            }
            return Ok(profile);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateSettings([FromBody] LabProfile update)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var profile = await _context.LabProfiles.FirstOrDefaultAsync();
            if (profile == null)
            {
                return NotFound(new { message = "Global Lab Profile settings not found." });
            }

            // Capture old settings for audit log
            var oldSettings = new
            {
                profile.Name,
                profile.Tagline,
                profile.Address,
                profile.Email,
                profile.Website,
                profile.Phone,
                profile.Accreditation,
                profile.FooterDisclaimer,
                profile.HeaderHeightMm,
                profile.FooterMarginMm,
                profile.ShowWatermark,
                profile.ShowHeaderOnReports,
                profile.ShowDigitalSignatures,
                profile.InvoicePrefix,
                profile.NextInvoiceNumber,
                profile.DefaultTaxPercent,
                profile.EnableQrPayment,
                profile.UpiId,
                profile.SmsGatewayProvider,
                profile.WhatsAppGatewayUrl,
                profile.SmtpHost,
                profile.SmtpPort,
                profile.BackupEnabled,
                profile.BackupFrequency
            };

            // Update basic info
            profile.Name = update.Name;
            profile.Tagline = update.Tagline;
            profile.Address = update.Address;
            profile.Email = update.Email;
            profile.Website = update.Website;
            profile.Phone = update.Phone;
            profile.Accreditation = update.Accreditation;
            profile.HeaderLogoUrl = update.HeaderLogoUrl;
            profile.WatermarkUrl = update.WatermarkUrl;
            profile.FooterDisclaimer = update.FooterDisclaimer;

            // Update branding
            profile.HeaderHeightMm = update.HeaderHeightMm;
            profile.FooterMarginMm = update.FooterMarginMm;
            profile.ShowWatermark = update.ShowWatermark;
            profile.ShowHeaderOnReports = update.ShowHeaderOnReports;
            profile.ShowDigitalSignatures = update.ShowDigitalSignatures;

            // Update Invoice config
            profile.InvoicePrefix = update.InvoicePrefix;
            profile.NextInvoiceNumber = update.NextInvoiceNumber;
            profile.DefaultTaxPercent = update.DefaultTaxPercent;
            profile.EnableQrPayment = update.EnableQrPayment;
            profile.UpiId = update.UpiId;

            // Update SMS gateway config
            profile.SmsGatewayProvider = update.SmsGatewayProvider;
            profile.SmsApiKey = update.SmsApiKey;
            profile.WhatsAppGatewayUrl = update.WhatsAppGatewayUrl;
            profile.WhatsAppApiKey = update.WhatsAppApiKey;

            // Update SMTP credentials
            profile.SmtpHost = update.SmtpHost;
            profile.SmtpPort = update.SmtpPort;
            profile.SmtpUsername = update.SmtpUsername;
            profile.SmtpPassword = update.SmtpPassword;
            profile.SmtpEnableSsl = update.SmtpEnableSsl;
            profile.SmtpSenderEmail = update.SmtpSenderEmail;
            profile.SmtpSenderName = update.SmtpSenderName;

            // Update Backups rules
            profile.BackupEnabled = update.BackupEnabled;
            profile.BackupFrequency = update.BackupFrequency;
            profile.BackupTime = update.BackupTime;
            profile.BackupPath = update.BackupPath;

            profile.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            // Log update settings event to Audit Service
            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "UpdateSystemSettings",
                "Settings",
                profile.LabProfileId,
                new { Old = oldSettings, New = update }
            );

            return Ok(profile);
        }
    }
}
