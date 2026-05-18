using System;

namespace SynOS.Models.DTOs.Payroll
{
    public class ProvisionalResultDto
    {
        public Guid EmployeeId { get; set; }
        public Guid PayComponentId { get; set; }
        public decimal Amount { get; set; }
        public decimal LopDays { get; set; }
    }
}
