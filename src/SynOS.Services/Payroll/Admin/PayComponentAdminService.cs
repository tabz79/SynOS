using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Enums; // For PayComponentType
using SynOS.Models.Entities.Payroll;
using System.Linq; // For LINQ queries

namespace SynOS.Services.Payroll.Admin
{
    public class PayComponentAdminService : IPayComponentAdminService
    {
        private readonly SynOSDbContext _context;

        public PayComponentAdminService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<PayComponent> CreatePayComponentAsync(string name, PayComponentType componentType)
        {
            // Reject duplicate PayComponent names.
            var existing = await _context.PayComponents
                                         .AsNoTracking()
                                                                                   .FirstOrDefaultAsync(pc => pc.Name != null && pc.Name.Equals(name, StringComparison.OrdinalIgnoreCase));            if (existing != null)
            {
                throw new InvalidOperationException($"PayComponent with name '{name}' already exists (case-insensitive).");
            }

            var payComponent = new PayComponent
            {
                PayComponentId = Guid.NewGuid(),
                Name = name,
                ComponentType = componentType,
                IsActive = true // Default value from entity
            };

            _context.PayComponents.Add(payComponent);
            await _context.SaveChangesAsync();
            return payComponent;
        }

        public async Task<PayComponent> UpdatePayComponentAsync(Guid payComponentId, string name)
        {
            var payComponent = await _context.PayComponents.FindAsync(payComponentId);
            if (payComponent == null)
            {
                throw new KeyNotFoundException($"PayComponent with ID '{payComponentId}' not found.");
            }

            // Reject duplicate PayComponent names (excluding current component).
            var existing = await _context.PayComponents
                                         .AsNoTracking()
                                                                                   .FirstOrDefaultAsync(pc => pc.Name != null && pc.Name.Equals(name, StringComparison.OrdinalIgnoreCase) && pc.PayComponentId != payComponentId);            if (existing != null)
            {
                throw new InvalidOperationException($"PayComponent with name '{name}' already exists (case-insensitive).");
            }

            // Forbid changing ComponentType after creation. (No explicit check needed as ComponentType is not an input).
            // This method only updates the name.

            payComponent.Name = name;
            await _context.SaveChangesAsync();
            return payComponent;
        }

        public async Task DeactivatePayComponentAsync(Guid payComponentId)
        {
            var payComponent = await _context.PayComponents.FindAsync(payComponentId);
            if (payComponent == null)
            {
                throw new KeyNotFoundException($"PayComponent with ID '{payComponentId}' not found.");
            }

            // Forbid physical deletion. (Handled by not calling Remove)
            // DeactivatePayComponent must set IsActive = false.
            if (payComponent.IsActive)
            {
                payComponent.IsActive = false;
                await _context.SaveChangesAsync();
            }
            else
            {
                throw new InvalidOperationException($"PayComponent with ID '{payComponentId}' is already inactive.");
            }
        }
    }
}
