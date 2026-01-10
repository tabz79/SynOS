using System;

namespace SynOS.Models.DTOs.Payroll
{
    public class PayrollValidationErrorDto
    {
        public Guid EmployeeId { get; set; }
        public string Message { get; set; }
    }
}
