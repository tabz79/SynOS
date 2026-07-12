using System;
using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;

namespace SynOS.Services
{
    public interface ITrustedKeyStore
    {
        string? GetPublicKeyPem(string keyId);
    }

    public class TrustedKeyStore : ITrustedKeyStore
    {
        private readonly IConfiguration _configuration;

        public TrustedKeyStore(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string? GetPublicKeyPem(string keyId)
        {
            var configKey = _configuration[$"TrustedKeys:{keyId}"];
            if (string.IsNullOrEmpty(configKey))
            {
                throw new CryptographicException($"CRITICAL CONFIGURATION ERROR: Trusted signing public key for KeyId '{keyId}' is missing in configuration.");
            }

            return configKey;
        }
    }
}
