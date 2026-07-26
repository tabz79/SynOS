using System;
using System.Security.Cryptography;
using System.Text;

namespace SynOS.Services.Security
{
    public static class LicenseKeyProtector
    {
        public static string Protect(string plaintext)
        {
            if (string.IsNullOrEmpty(plaintext)) return string.Empty;
            try
            {
                var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
                var encryptedBytes = ProtectedData.Protect(plaintextBytes, null, DataProtectionScope.LocalMachine);
                return Convert.ToBase64String(encryptedBytes);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL] LicenseKeyProtector.Protect failed: {ex.Message}");
                return string.Empty;
            }
        }

        public static string Unprotect(string encryptedBase64)
        {
            if (string.IsNullOrEmpty(encryptedBase64)) return string.Empty;
            try
            {
                var encryptedBytes = Convert.FromBase64String(encryptedBase64);
                var decryptedBytes = ProtectedData.Unprotect(encryptedBytes, null, DataProtectionScope.LocalMachine);
                return Encoding.UTF8.GetString(decryptedBytes);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL] LicenseKeyProtector.Unprotect failed: {ex.Message}");
                return string.Empty;
            }
        }
    }
}
