using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.IMS;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Enums.IMS;

namespace SynOS.Services
{
    public class IMSWastageInsightService : IIMSWastageInsightService
    {
        private readonly SynOSDbContext _context;

        public IMSWastageInsightService(SynOSDbContext context)
        {
            _context = context;
        }

        private IQueryable<ImsStockMovement> GetBaseQuery()
        {
            return _context.ImsStockMovements
                .Include(m => m.Consumable) // Needed for ConsumableName, ConsumableCategory
                .Include(m => m.Tube)       // Needed for legacy TubeName
                .Include(m => m.ConsumableLot) // Needed for ConsumableLot.CostPerUnit
                .Include(m => m.TubeLot);      // Needed for TubeLot.CostPerUnit
        }

        public async Task<IEnumerable<WastageMovementDto>> GetExpiryLossAsync()
        {
            return await GetBaseQuery()
                .Where(m => m.MovementType == StockMovementType.Expiry)
                .Select(m => new WastageMovementDto
                {
                    MovementId = m.MovementId,
                    ConsumableId = m.ConsumableId,
                    ConsumableName = m.Consumable != null ? m.Consumable.Name : (m.Tube != null ? m.Tube.Name : null),
                    ConsumableCategory = m.Consumable != null ? m.Consumable.Category : null,
                    Quantity = m.Quantity,
                    CostPerUnit = m.ConsumableLot != null ? m.ConsumableLot.CostPerUnit : (m.TubeLot != null ? m.TubeLot.CostPerUnit : null),
                    MovementType = m.MovementType,
                    ReasonCode = m.ReasonCode,
                    MovedAt = m.MovedAt
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<WastageMovementDto>> GetOperationalWastageAsync()
        {
            return await GetBaseQuery()
                .Where(m => m.MovementType == StockMovementType.Wastage)
                .Select(m => new WastageMovementDto
                {
                    MovementId = m.MovementId,
                    ConsumableId = m.ConsumableId,
                    ConsumableName = m.Consumable != null ? m.Consumable.Name : (m.Tube != null ? m.Tube.Name : null),
                    ConsumableCategory = m.Consumable != null ? m.Consumable.Category : null,
                    Quantity = m.Quantity,
                    CostPerUnit = m.ConsumableLot != null ? m.ConsumableLot.CostPerUnit : (m.TubeLot != null ? m.TubeLot.CostPerUnit : null),
                    MovementType = m.MovementType,
                    ReasonCode = m.ReasonCode,
                    MovedAt = m.MovedAt
                })
                .ToListAsync();
        }
        
        public async Task<IEnumerable<WastageMovementDto>> GetCalibrationCostAsync()
        {
            return await GetBaseQuery()
                .Where(m => m.MovementType == StockMovementType.Calibration)
                .Select(m => new WastageMovementDto
                {
                    MovementId = m.MovementId,
                    ConsumableId = m.ConsumableId,
                    ConsumableName = m.Consumable != null ? m.Consumable.Name : (m.Tube != null ? m.Tube.Name : null),
                    ConsumableCategory = m.Consumable != null ? m.Consumable.Category : null,
                    Quantity = m.Quantity,
                    CostPerUnit = m.ConsumableLot != null ? m.ConsumableLot.CostPerUnit : (m.TubeLot != null ? m.TubeLot.CostPerUnit : null),
                    MovementType = m.MovementType,
                    ReasonCode = m.ReasonCode,
                    MovedAt = m.MovedAt
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<WastageMovementDto>> GetUnexplainedLossAsync()
        {
            return await GetBaseQuery()
                .Where(m => m.MovementType == StockMovementType.Adjustment || m.ReasonCode == WastageReasonCode.Other || m.ReferenceId == null)
                .Select(m => new WastageMovementDto
                {
                    MovementId = m.MovementId,
                    ConsumableId = m.ConsumableId,
                    ConsumableName = m.Consumable != null ? m.Consumable.Name : (m.Tube != null ? m.Tube.Name : null),
                    ConsumableCategory = m.Consumable != null ? m.Consumable.Category : null,
                    Quantity = m.Quantity,
                    CostPerUnit = m.ConsumableLot != null ? m.ConsumableLot.CostPerUnit : (m.TubeLot != null ? m.TubeLot.CostPerUnit : null),
                    MovementType = m.MovementType,
                    ReasonCode = m.ReasonCode,
                    MovedAt = m.MovedAt
                })
                .ToListAsync();
        }
    }
}
