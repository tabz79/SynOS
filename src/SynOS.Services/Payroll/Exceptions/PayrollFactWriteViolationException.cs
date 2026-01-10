using System;

namespace SynOS.Services.Payroll.Exceptions
{
    public class PayrollFactWriteViolationException : Exception
    {
        public PayrollFactWriteViolationException(string message) : base(message)
        {
        }
    }
}
