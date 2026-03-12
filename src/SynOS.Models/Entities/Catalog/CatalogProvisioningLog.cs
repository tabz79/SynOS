using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Catalog
{
    public class CatalogProvisioningLog
    {
        [Key]
        public Guid ProvisionId { get; set; }
        public DateTimeOffset StartedAt { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }
        public bool IsDryRun { get; set; }
        public string CatalogVersionHash { get; set; } = string.Empty;
        public int TestsAffected { get; set; }
        public int ParametersAffected { get; set; }
        public int MappingsAffected { get; set; }
        public int PricingChanges { get; set; }
        
        /// <summary>
        /// JSON array of TestCodes affected by this provisioning run.
        /// </summary>
        public string? AffectedTestCodes { get; set; }
        
        [MaxLength(50)]
        public string Status { get; set; } = string.Empty; // "Success", "Failed", "Pending", "Locked"
        public string? ErrorMessage { get; set; }
    }
}
