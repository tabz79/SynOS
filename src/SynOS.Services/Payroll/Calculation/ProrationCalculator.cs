namespace SynOS.Services.Payroll.Calculation
{
    public class ProrationResult
    {
        public decimal ProratedAmount { get; set; }
        public decimal UnpaidLeaveImpact { get; set; }
    }

    public class ProrationCalculator
    {
        public ProrationResult Calculate(
            decimal originalAmount,
            decimal denominator,
            decimal financialPayableUnits,
            decimal unpaidLeaveUnits
        )
        {
            if (denominator == 0)
            {
                throw new System.DivideByZeroException("Proration denominator cannot be zero.");
            }

            return new ProrationResult
            {
                ProratedAmount = (originalAmount * financialPayableUnits) / denominator,
                UnpaidLeaveImpact = (originalAmount * unpaidLeaveUnits) / denominator
            };
        }
    }
}
