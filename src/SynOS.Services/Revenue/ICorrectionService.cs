using System;
using System.Threading.Tasks;
using SynOS.Models.Enums;
using SynOS.Models.DTOs; // ADDED

namespace SynOS.Services.Revenue
{
    public interface ICorrectionService
    {
        Task ApplyCorrectionAsync(Guid visitId, ApplyCorrectionCommand command, Guid actorUserId);
        Task<CorrectionContextDto> GetCorrectionContextAsync(Guid visitId);
    }

    public class ApplyCorrectionCommand
    {
        public CorrectionType Type { get; set; }
        public Guid? TargetEntityId { get; set; } // OrderId or DiscountMasterId
        public decimal? NewValue { get; set; } // For price adjustments
        public string? Reason { get; set; }
        public string? PayloadJson { get; set; } // Extra data (e.g. test code for AddTest)
    }
}
