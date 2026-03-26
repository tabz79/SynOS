using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Dtos;
using SynOS.Models.Entities.Catalog;

namespace SynOS.Services
{
    public class CatalogManagementService : ICatalogManagementService
    {
        private readonly SynOSDbContext _context;
        private readonly ICatalogProvisioningService _provisioningService;

        public CatalogManagementService(SynOSDbContext context, ICatalogProvisioningService provisioningService)
        {
            _context = context;
            _provisioningService = provisioningService;
        }

        public async Task<CatalogManagementResultDto> UpdateTestAsync(CatalogTest updatedTest)
        {
            // 1. Capture Snapshot (Old State)
            var snapshot = await _context.CatalogTests
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TestCode == updatedTest.TestCode);

            if (snapshot == null) 
                return new CatalogManagementResultDto { Success = false, Message = "Test not found in staging." };

            // 2. Stage Changes (Short Transaction)
            _context.Entry(updatedTest).State = EntityState.Modified;
            try
            {
                updatedTest.UpdatedAt = DateTimeOffset.UtcNow;
                await _context.SaveChangesAsync();
                // RowVersion is automatically updated in updatedTest object after SaveChangesAsync
            }
            catch (DbUpdateConcurrencyException)
            {
                return new CatalogManagementResultDto { Success = false, Message = "Update failed: The record was modified by another user in the staging area." };
            }

            // 3. Provision (Out-of-Transaction Sync to Live)
            var provResult = await _provisioningService.ProvisionAsync(false);

            if (provResult.Status == "Success" || provResult.Status == "DryRun")
            {
                return new CatalogManagementResultDto { Success = true, ProvisioningResult = provResult };
            }

            // 4. Safe Restoration (Compensating Action)
            // Fetch current to verify no concurrent changes happened since our Stage commit
            var current = await _context.CatalogTests.FirstOrDefaultAsync(t => t.TestCode == updatedTest.TestCode);
            
            if (current != null && current.RowVersion.SequenceEqual(updatedTest.RowVersion))
            {
                // Consistency Match: We can safely restore the snapshot
                // Map snapshot data onto the current tracked entity to retain latest RowVersion for the restore commit
                _context.Entry(current).CurrentValues.SetValues(snapshot);
                current.UpdatedAt = DateTimeOffset.UtcNow;
                
                await _context.SaveChangesAsync();
                return new CatalogManagementResultDto 
                { 
                    Success = false, 
                    Message = $"Provisioning error: {provResult.ErrorMessage}. Changes were automatically reverted in staging.",
                    ProvisioningResult = provResult 
                };
            }

            return new CatalogManagementResultDto 
            { 
                Success = false, 
                Message = $"Provisioning error: {provResult.ErrorMessage}. CRITICAL: Progress-safe rollback skipped due to concurrent modification in staging.",
                ProvisioningResult = provResult 
            };
        }

        public async Task<CatalogManagementResultDto> UpdateParameterAsync(CatalogParameter updatedParam)
        {
            // 1. Capture Snapshot (Old State)
            var snapshot = await _context.CatalogParameters
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == updatedParam.Id);

            if (snapshot == null) 
                return new CatalogManagementResultDto { Success = false, Message = "Parameter not found in staging." };

            // 2. Stage Changes (Short Transaction)
            _context.Entry(updatedParam).State = EntityState.Modified;
            try
            {
                updatedParam.UpdatedAt = DateTimeOffset.UtcNow;
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return new CatalogManagementResultDto { Success = false, Message = "Update failed: Concurrent modification detected in staging." };
            }

            // 3. Provision
            var provResult = await _provisioningService.ProvisionAsync(false);

            if (provResult.Status == "Success" || provResult.Status == "DryRun")
            {
                return new CatalogManagementResultDto { Success = true, ProvisioningResult = provResult };
            }

            // 4. Safe Restoration
            var current = await _context.CatalogParameters.FirstOrDefaultAsync(p => p.Id == updatedParam.Id);
            
            if (current != null && current.RowVersion.SequenceEqual(updatedParam.RowVersion))
            {
                _context.Entry(current).CurrentValues.SetValues(snapshot);
                current.UpdatedAt = DateTimeOffset.UtcNow;
                
                await _context.SaveChangesAsync();
                return new CatalogManagementResultDto 
                { 
                    Success = false, 
                    Message = $"Provisioning failed: {provResult.ErrorMessage}. Reverted to original state.",
                    ProvisioningResult = provResult 
                };
            }

            return new CatalogManagementResultDto 
            { 
                Success = false, 
                Message = $"Provisioning failed: {provResult.ErrorMessage}. Manual cleanup required: Snapshot out-of-date.",
                ProvisioningResult = provResult 
            };
        }
    }
}
