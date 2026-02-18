using System;
using System.Threading.Tasks;

namespace SynOS.Services
{
    public interface IAccessionService
    {
        /// <summary>
        /// Generates the next sequential accession number for a given branch and date.
        /// This method MUST be called within an existing transaction context.
        /// It uses database-level locking (UPDLOCK) to ensure monotonicity and uniqueness.
        /// </summary>
        /// <param name="branchId">The branch ID to generate the sequence for.</param>
        /// <param name="date">The date for the sequence (usually Lab Local Today).</param>
        /// <returns>A formatted accession number string (e.g., HYD-231025-0001).</returns>
        Task<string> GenerateNextAccessionNumberAsync(Guid branchId, DateTime date);
        Task<string> GenerateRadiologyAccessionNumberAsync(Guid branchId);
    }
}
