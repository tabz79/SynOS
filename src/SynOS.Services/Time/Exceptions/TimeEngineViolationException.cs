using System;

namespace SynOS.Services.Time.Exceptions
{
    public class TimeEngineViolationException : Exception
    {
        public TimeEngineViolationException(string message) : base(message)
        {
        }
    }
}
