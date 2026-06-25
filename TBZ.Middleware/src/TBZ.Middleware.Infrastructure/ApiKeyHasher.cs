using System.Security.Cryptography;
using System.Text;

namespace TBZ.Middleware.Infrastructure
{
    public static class ApiKeyHasher
    {
        public static string Hash(string apiKey)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(apiKey));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }

        public static bool Verify(string apiKey, string hash)
        {
            var keyHash = Hash(apiKey);
            return string.Equals(keyHash, hash, StringComparison.OrdinalIgnoreCase);
        }
    }
}
