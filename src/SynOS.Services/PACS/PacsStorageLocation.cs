using System;
using System.IO;
using System.Runtime.InteropServices;

namespace SynOS.Services.PACS
{
    /// <summary>
    /// Centralized cross-platform resolution and verification for PACS storage directories.
    /// Ensures seamless operation on Windows on-premise servers and macOS/Linux demonstration hosts.
    /// </summary>
    public static class PacsStorageLocation
    {
        public static string GetRootPath(string? configuredPath = null)
        {
            if (!string.IsNullOrWhiteSpace(configuredPath))
            {
                // If running on non-Windows but path is configured with Windows drive syntax (e.g. C:\...)
                if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows) &&
                    (configuredPath.StartsWith("C:", StringComparison.OrdinalIgnoreCase) || configuredPath.Contains('\\')))
                {
                    var fallbackUnix = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".synos", "PACS");
                    EnsureDirectoryExists(fallbackUnix);
                    return fallbackUnix;
                }

                try
                {
                    EnsureDirectoryExists(configuredPath);
                    return configuredPath;
                }
                catch
                {
                    // Fall back to platform defaults if specified path cannot be initialized
                }
            }

            var defaultRoot = RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
                ? @"C:\SynOS_Files\PACS"
                : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".synos", "PACS");

            EnsureDirectoryExists(defaultRoot);
            return defaultRoot;
        }

        public static string GetIncomingScansPath(string? configuredRoot = null)
        {
            var root = GetRootPath(configuredRoot);
            var incoming = Path.Combine(root, "IncomingScans");
            EnsureDirectoryExists(incoming);
            return incoming;
        }

        private static void EnsureDirectoryExists(string path)
        {
            if (!Directory.Exists(path))
            {
                Directory.CreateDirectory(path);
            }
        }
    }
}
