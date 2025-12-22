namespace SynOS.Models.Entities.Payments
{
    /// <summary>
    /// Defines the direction of a payment confirmation.
    /// This is a simple discriminator, not a workflow status.
    /// </summary>
    public enum PaymentDirection
    {
        /// <summary>
        /// Represents money moving into the system.
        /// </summary>
        In,

        /// <summary>
        /// Represents money moving out of the system.
        /// </summary>
        Out
    }
}
