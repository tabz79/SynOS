using System;

namespace SynOS.Services.Compliance.Exceptions
{
    public class ComplianceEngineViolationException : Exception
    {
        public ComplianceEngineViolationException(string message) : base(message) { }
        public ComplianceEngineViolationException(string message, Exception innerException) : base(message, innerException) { }
    }
}
