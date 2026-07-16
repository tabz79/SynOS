using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SynOS.Data;

namespace SynOS.Services
{
    public class WindowsBackupKeyProvider : IBackupKeyProvider
    {
        private readonly IConfiguration _configuration;
        private readonly IServiceProvider _serviceProvider;
        private static readonly object _lock = new object();
        private string? _cachedKey;

        public WindowsBackupKeyProvider(IConfiguration configuration, IServiceProvider serviceProvider)
        {
            _configuration = configuration;
            _serviceProvider = serviceProvider;
        }

        public string GetEncryptionKey()
        {
            if (_cachedKey != null)
            {
                return _cachedKey;
            }

            lock (_lock)
            {
                if (_cachedKey != null)
                {
                    return _cachedKey;
                }

                // Resolve base storage directory from appsettings.json to avoid DB config override mismatch
                var baseDir = GetStaticFileStorageBasePath();
                var configDir = Path.Combine(baseDir, "Config");
                var keyPath = Path.Combine(configDir, "backup.key");

                if (File.Exists(keyPath))
                {
                    try
                    {
                        var encryptedBytes = File.ReadAllBytes(keyPath);
                        var decryptedBytes = ProtectedData.Unprotect(encryptedBytes, null, DataProtectionScope.LocalMachine);
                        _cachedKey = Encoding.UTF8.GetString(decryptedBytes);
                        return _cachedKey;
                    }
                    catch (Exception ex)
                    {
                        throw new CryptographicException("Failed to decrypt the backup encryption key vault.", ex);
                    }
                }
                else
                {
                    try
                    {
                        Directory.CreateDirectory(configDir);

                        // 1. One-time migration path: check if legacy key exists in the database
                        string? keyString = null;
                        try
                        {
                            using (var scope = _serviceProvider.CreateScope())
                            {
                                var context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                                var profile = context.LabProfiles.FirstOrDefault();
                                if (profile != null && !string.IsNullOrWhiteSpace(profile.BackupEncryptionKey))
                                {
                                    keyString = profile.BackupEncryptionKey;
                                }
                            }
                        }
                        catch
                        {
                            // If DB is unreachable, un-migrated, or doesn't exist, ignore and proceed to generate
                        }

                        // 2. Generate a new key if no legacy key exists
                        if (string.IsNullOrEmpty(keyString))
                        {
                            var keyBytes = new byte[32];
                            using (var rng = RandomNumberGenerator.Create())
                            {
                                rng.GetBytes(keyBytes);
                            }
                            keyString = Convert.ToBase64String(keyBytes);
                        }

                        var plaintextBytes = Encoding.UTF8.GetBytes(keyString);
                        var encryptedBytes = ProtectedData.Protect(plaintextBytes, null, DataProtectionScope.LocalMachine);
                        File.WriteAllBytes(keyPath, encryptedBytes);

                        _cachedKey = keyString;
                        return _cachedKey;
                    }
                    catch (Exception ex)
                    {
                        throw new CryptographicException("Failed to generate/migrate and store the backup encryption key vault.", ex);
                    }
                }
            }
        }

        public string GetKeyId()
        {
            return "default-machine-key-v1";
        }

        private string GetStaticFileStorageBasePath()
        {
            var appSettingsPath = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
            if (File.Exists(appSettingsPath))
            {
                try
                {
                    var jsonText = File.ReadAllText(appSettingsPath);
                    using (var doc = JsonDocument.Parse(jsonText))
                    {
                        if (doc.RootElement.TryGetProperty("FileStorage", out var fileStorage) &&
                            fileStorage.TryGetProperty("BasePath", out var basePathProp))
                        {
                            var path = basePathProp.GetString();
                            if (!string.IsNullOrEmpty(path))
                            {
                                return path;
                            }
                        }
                    }
                }
                catch { }
            }
            return "C:\\SynOS_Files";
        }

        public bool IsKeyConfigured()
        {
            var baseDir = GetStaticFileStorageBasePath();
            var keyPath = Path.Combine(baseDir, "Config", "backup.key");
            if (File.Exists(keyPath))
            {
                return true;
            }

            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                    var profile = context.LabProfiles.FirstOrDefault();
                    return profile != null && !string.IsNullOrWhiteSpace(profile.BackupEncryptionKey);
                }
            }
            catch
            {
                return false;
            }
        }
    }
}
