using System;
using System.Collections.Generic;

namespace SynOS.Models.Dtos
{
    public class CatalogProvisioningResultDto
    {
        public Guid ProvisionId { get; set; }
        public bool IsDryRun { get; set; }
        public string VersionHash { get; set; } = string.Empty;
        public int TestsAffected { get; set; }
        public int ParametersAffected { get; set; }
        public int MappingsAffected { get; set; }
        public int PricingChanges { get; set; }
        public List<string> AffectedTestCodes { get; set; } = new List<string>();
        public string Status { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
    }
}
