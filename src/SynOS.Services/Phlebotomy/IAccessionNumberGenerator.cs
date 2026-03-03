using System;
using System.Threading.Tasks;

namespace SynOS.Services.Phlebotomy
{
    public interface IAccessionNumberGenerator
    {
        /// <summary>
        /// Generates a unique, daily-resetting accession number for a branch.
        /// Format: {BranchCode}{yyMMdd}{6-digit-sequence}
        /// </summary>
        Task<string> GenerateAsync(Guid branchId, string branchCode);
    }
}
