using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Payroll;

namespace SynOS.Services.Payroll.Admin
{
    public class PayStructureAdminService : IPayStructureAdminService
    {
        private readonly SynOSDbContext _context;

        public PayStructureAdminService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> CreatePayStructureAsync(string name, string? description, IReadOnlyList<Guid> payComponentIds)
        {
            // Empty Component Guard
            if (payComponentIds == null || !payComponentIds.Any())
            {
                throw new InvalidOperationException("At least one PayComponentId is required to create a PayStructure.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            // Validate all PayComponentIds exist and are active
            var components = await _context.PayComponents
                .Where(pc => payComponentIds.Contains(pc.PayComponentId))
                .ToListAsync();

            if (components.Count != payComponentIds.Count)
            {
                var missing = payComponentIds.Except(components.Select(c => c.PayComponentId));
                throw new KeyNotFoundException($"PayComponent(s) with ID(s) '{string.Join(", ", missing)}' not found.");
            }
            if (components.Any(c => !c.IsActive))
            {
                var inactive = components.First(c => !c.IsActive);
                throw new InvalidOperationException($"PayComponent '{inactive.Name}' is not active.");
            }

            var newStructure = new PayStructure
            {
                PayStructureId = Guid.NewGuid(),
                Name = name,
                Description = description
            };
            _context.PayStructures.Add(newStructure);

            foreach (var componentId in payComponentIds)
            {
                var link = new PayStructureComponent
                {
                    PayStructureComponentId = Guid.NewGuid(),
                    PayStructureId = newStructure.PayStructureId,
                    PayComponentId = componentId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.PayStructureComponents.Add(link);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return newStructure.PayStructureId;
        }

        public async Task<Guid> CreateNewVersionOfPayStructureAsync(Guid basePayStructureId, string name, string? description, IReadOnlyList<Guid> payComponentIds)
        {
            // Empty Component Guard
            if (payComponentIds == null || !payComponentIds.Any())
            {
                throw new InvalidOperationException("At least one PayComponentId is required to create a new version of a PayStructure.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            // Validate base PayStructure exists
            var baseStructure = await _context.PayStructures
                .AsNoTracking()
                .FirstOrDefaultAsync(ps => ps.PayStructureId == basePayStructureId);
            if (baseStructure == null)
            {
                throw new KeyNotFoundException($"Base PayStructure with ID '{basePayStructureId}' not found.");
            }

            // Validate all PayComponentIds exist and are active
            var components = await _context.PayComponents
                .Where(pc => payComponentIds.Contains(pc.PayComponentId))
                .ToListAsync();
            
            if (components.Count != payComponentIds.Count)
            {
                var missing = payComponentIds.Except(components.Select(c => c.PayComponentId));
                throw new KeyNotFoundException($"PayComponent(s) with ID(s) '{string.Join(", ", missing)}' not found.");
            }
            if (components.Any(c => !c.IsActive))
            {
                var inactive = components.First(c => !c.IsActive);
                throw new InvalidOperationException($"PayComponent '{inactive.Name}' is not active.");
            }

            // Create a new PayStructure row (new version)
            var newVersion = new PayStructure
            {
                PayStructureId = Guid.NewGuid(),
                Name = name,
                Description = description
            };
            _context.PayStructures.Add(newVersion);

            // Persist PayStructureComponent rows for the new version only
            foreach (var componentId in payComponentIds)
            {
                var link = new PayStructureComponent
                {
                    PayStructureComponentId = Guid.NewGuid(),
                    PayStructureId = newVersion.PayStructureId,
                    PayComponentId = componentId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.PayStructureComponents.Add(link);
            }
            
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return newVersion.PayStructureId;
        }
    }
}
