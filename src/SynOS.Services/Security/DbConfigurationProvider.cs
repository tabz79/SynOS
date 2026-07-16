using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using SynOS.Data;

namespace SynOS.Services.Security
{
    public class DbConfigurationSource : IConfigurationSource
    {
        private readonly string _connectionString;
        private readonly bool _isDevelopment;

        public DbConfigurationSource(string connectionString, bool isDevelopment)
        {
            _connectionString = connectionString;
            _isDevelopment = isDevelopment;
        }

        public IConfigurationProvider Build(IConfigurationBuilder builder)
        {
            return new DbConfigurationProvider(_connectionString, _isDevelopment);
        }
    }

    public class DbConfigurationProvider : ConfigurationProvider
    {
        private readonly string _connectionString;
        private readonly bool _isDevelopment;

        public DbConfigurationProvider(string connectionString, bool isDevelopment)
        {
            _connectionString = connectionString;
            _isDevelopment = isDevelopment;
        }

        public override void Load()
        {
            var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
            optionsBuilder.UseSqlServer(_connectionString);

            using var context = new SynOSDbContext(optionsBuilder.Options);
            bool loaded = false;
            try
            {
                var profile = context.LabProfiles.AsNoTracking().FirstOrDefault();
                if (profile != null)
                {
                    Data = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
                    {
                        { "Middleware:ApiUrl", string.IsNullOrWhiteSpace(profile.MiddlewareApiUrl) ? "http://localhost:5069/api/events" : profile.MiddlewareApiUrl },
                        { "Middleware:ApiKey", string.IsNullOrWhiteSpace(profile.MiddlewareApiKey) ? "TBZ-LAB-KEY-12345" : profile.MiddlewareApiKey },
                        { "Middleware:LabId", string.IsNullOrWhiteSpace(profile.LabId) ? "LAB001" : profile.LabId },
                        { "License:Type", string.IsNullOrWhiteSpace(profile.LicenseType) ? "Commercial" : profile.LicenseType },
                        { "License:MaximumBranches", profile.MaximumBranches.ToString() },
                        { "License:ExpiryDate", profile.LicenseExpiryDate?.ToString("o") },
                        { "License:Status", string.IsNullOrWhiteSpace(profile.LicenseStatus) ? "Active" : profile.LicenseStatus },
                        { "License:LastLicenseValidationUtc", profile.LastLicenseValidationUtc?.ToString("o") },
                        { "License:EnabledFeatures", profile.EnabledFeatures != null ? string.Join(",", profile.EnabledFeatures) : "" },
                        { "Diagnostics:EncryptionKey", string.IsNullOrWhiteSpace(profile.DiagnosticsEncryptionKey) ? "TBZ-DIAGNOSTICS-KEY-12345-67890" : profile.DiagnosticsEncryptionKey },
                        { "Pacs:MaxInstancesPerSeriesInSeriesTree", (profile.PacsMaxInstancesPerSeriesInSeriesTree == 0 ? 5000 : profile.PacsMaxInstancesPerSeriesInSeriesTree).ToString() },
                        { "Pacs:MaxTotalInstancesPerStudyInSeriesTree", (profile.PacsMaxTotalInstancesPerStudyInSeriesTree == 0 ? 20000 : profile.PacsMaxTotalInstancesPerStudyInSeriesTree).ToString() },
                        { "Features:ReferralEconomics:Enabled", (profile.ReferralEconomicsEnabled).ToString().ToLower() },
                        { "Inventory:ValuationMethod", string.IsNullOrWhiteSpace(profile.InventoryValuationMethod) ? "FIFO" : profile.InventoryValuationMethod },
                        { "FileStorage:BasePath", string.IsNullOrWhiteSpace(profile.ReportStorageFolder) ? @"C:\SynOS_Files" : profile.ReportStorageFolder },
                        { "Working:Directory", string.IsNullOrWhiteSpace(profile.WorkingDirectory) ? @"C:\SynOS_Working" : profile.WorkingDirectory },
                        { "Jwt:ExpiryMinutes", (profile.JwtExpiryMinutes == 0 ? 1440 : profile.JwtExpiryMinutes).ToString() },
                        { "Jwt:RefreshTokenExpiryDays", (profile.JwtRefreshTokenExpiryDays == 0 ? 7 : profile.JwtRefreshTokenExpiryDays).ToString() },
                        { "Ota:Channel", profile.OtaChannel ?? "Stable" },
                        { "Ota:Policy", profile.OtaPolicy ?? "NotifyOnly" },
                        { "Ota:MaintenanceDay", profile.MaintenanceDay ?? "Sunday" },
                        { "Ota:MaintenanceStartHour", profile.MaintenanceStartHour ?? "02:00" },
                        { "Ota:MaintenanceEndHour", profile.MaintenanceEndHour ?? "04:00" }
                    };
                    loaded = true;
                }
            }
            catch
            {
                // Db is not migrated yet or doesn't exist, ignore
            }

            if (!loaded)
            {
                // Fallback to default development/bootstrap values if database is not ready
                Data = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
                {
                    { "Middleware:ApiUrl", "http://localhost:5069/api/events" },
                    { "Middleware:ApiKey", "TBZ-LAB-KEY-12345" },
                    { "Middleware:LabId", "LAB001" },
                    { "License:Type", "Enterprise" },
                    { "License:ExpiryDate", "" },
                    { "License:Status", "Active" },
                    { "License:EnabledFeatures", "" },
                    { "Diagnostics:EncryptionKey", "TBZ-DIAGNOSTICS-KEY-12345-67890" },
                    { "Pacs:MaxInstancesPerSeriesInSeriesTree", "5000" },
                    { "Pacs:MaxTotalInstancesPerStudyInSeriesTree", "20000" },
                    { "Features:ReferralEconomics:Enabled", "true" },
                    { "Inventory:ValuationMethod", "FIFO" },
                    { "FileStorage:BasePath", @"C:\SynOS_Files" },
                    { "Working:Directory", @"C:\SynOS_Working" },
                    { "Jwt:ExpiryMinutes", "1440" },
                    { "Jwt:RefreshTokenExpiryDays", "7" },
                    { "Ota:Channel", "Stable" },
                    { "Ota:Policy", "NotifyOnly" },
                    { "Ota:MaintenanceDay", "Sunday" },
                    { "Ota:MaintenanceStartHour", "02:00" },
                    { "Ota:MaintenanceEndHour", "04:00" }
                };
            }
        }
    }
}
