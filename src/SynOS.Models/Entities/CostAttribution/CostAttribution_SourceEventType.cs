namespace SynOS.Models.Entities.CostAttribution
{
    /// <summary>
    /// Defines the type of system event that generated a Usage Fact.
    /// This is strictly for system-written, append-only facts.
    /// </summary>
    public enum CostAttribution_SourceEventType
    {
        /// <summary>
        /// Consumption was triggered by the execution of a test procedure.
        /// </summary>
        TestExecution,

        /// <summary>
        /// Consumption was triggered by the collection of a sample (e.g., use of a vacutainer).
        /// </summary>
        SampleCollection,

        /// <summary>
        /// Consumption was triggered by a machine calibration event.
        /// </summary>
        Calibration,

        /// <summary>
        /// Consumption was recorded as wastage by a system process (e.g., expiry).
        /// </summary>
        Wastage,

        /// <summary>
        /// A system-generated fact that corrects a previous, erroneous fact.
        /// This creates an immutable audit trail for corrections.
        /// </summary>
        SystemCorrection
    }
}
