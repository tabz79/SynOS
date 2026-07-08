using System;
using System.Text.Json;
using Xunit;
using SynOS.Services;

namespace SynOS.Tests
{
    public class DiagnosticsServiceTests
    {
        [Theory]
        [InlineData("patient name John Doe", "patient name John Doe")] // Name is not redacted by phone/email regex
        [InlineData("contact: john.doe@example.com", "contact: [REDACTED_EMAIL]")]
        [InlineData("phone is +91 9876543210", "phone is [REDACTED_PHONE]")]
        [InlineData("phone: 703-299-6647", "phone: [REDACTED_PHONE]")]
        [InlineData("database password=mySecret123;host=...", "database password=[REDACTED_CREDENTIALS];host=...")]
        [InlineData("ApiKey: key_12345", "ApiKey=[REDACTED_CREDENTIALS]")]
        [InlineData("Patient ID: PAT-12345-678", "Patient ID: PAT-[REDACTED_ID]")]
        [InlineData("MRN: MRN-909-abc", "MRN: MRN-[REDACTED_ID]")]
        public void RedactPII_Should_Redact_Sensitive_Information(string input, string expected)
        {
            // Act
            var result = DiagnosticsService.RedactPII(input);

            // Assert
            Assert.Equal(expected, result);
        }
    }
}
