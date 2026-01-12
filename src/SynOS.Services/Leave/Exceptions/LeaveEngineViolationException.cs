using System;

namespace SynOS.Services.Leave.Exceptions
{
    public class LeaveEngineViolationException : Exception
    {
        public LeaveEngineViolationException(string message) : base(message)
        {
        }

        public LeaveEngineViolationException(string message, Exception innerException) : base(message, innerException)
        {
        }
    }
}
