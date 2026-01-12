using System;

namespace SynOS.Services.Payroll.Orchestration.Exceptions
{
    public class PayrollOrchestrationException : Exception
    {
        public PayrollOrchestrationException(string message) : base(message)
        {
        }

        public PayrollOrchestrationException(string message, Exception innerException) : base(message, innerException)
        {
        }
    }
}
