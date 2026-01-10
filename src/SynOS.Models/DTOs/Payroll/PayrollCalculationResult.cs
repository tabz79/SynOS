using System.Collections.Generic;

namespace SynOS.Models.DTOs.Payroll
{
    public class PayrollCalculationResult
    {
        public List<ProvisionalResultDto> ProvisionalResults { get; set; } = new List<ProvisionalResultDto>();
        public List<PayrollValidationErrorDto> ValidationErrors { get; set; } = new List<PayrollValidationErrorDto>();
    }
}
