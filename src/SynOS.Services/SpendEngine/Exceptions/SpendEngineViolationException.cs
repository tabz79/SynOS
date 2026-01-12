using System;

namespace SynOS.Services.SpendEngine.Exceptions
{
    public class SpendEngineViolationException : Exception
    {
        public SpendEngineViolationException(string message) : base(message) { }
        public SpendEngineViolationException(string message, Exception innerException) : base(message, innerException) { }
    }
}
