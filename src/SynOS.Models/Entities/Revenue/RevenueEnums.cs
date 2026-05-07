namespace SynOS.Models.Entities.Revenue
{
    /// <summary>
    /// Defines the direction of a revenue fact.
    /// </summary>
    public enum RevenueDirection
    {
        Inflow,
        Reversal // For refunds, chargebacks, etc.
    }

    /// <summary>
    /// Defines the category of the entity from which revenue was received.
    /// </summary>
    public enum RevenueSourceType
    {
        Patient,
        Corporate,
        Insurance,
        Partner,
        Other
    }

    /// <summary>
    /// Defines the method by which a payment was made.
    /// </summary>
    public enum PaymentMode
    {
        Cash,
        UPI,
        Card,
        BankTransfer,
        Other
    }
}
