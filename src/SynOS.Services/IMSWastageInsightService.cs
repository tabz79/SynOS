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

        public async Task<IEnumerable<WastageMovementDto>> GetExpiryLossAsync()
        {
            return await _context.ImsStockMovements
                .Where(m => m.MovementType == StockMovementType.Expiry)
                .Select(m => new WastageMovementDto
                {
                    MovementId = m.MovementId,
                    ConsumableId = m.ConsumableId,
                    ConsumableName = m.Consumable != null ? m.Consumable.Name : (m.Tube != null ? m.Tube.Name : "N/A"),
                    ConsumableCategory = m.Consumable != null ? m.Consumable.Category : ConsumableCategory.Pathology, // Default for legacy tubes
                    Quantity = m.Quantity,
                    CostPerUnit = m.ConsumableLot != null ? m.ConsumableLot.CostPerUnit : (m.TubeLot != null ? m.TubeLot.CostPerUnit : 0),
                    MovementType = m.MovementType,
                    ReasonCode = m.ReasonCode,
                    MovedAt = m.MovedAt
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<WastageMovementDto>> GetOperationalWastageAsync()
        {
            return await _context.ImsStockMovements
                .Where(m => m.MovementType == StockMovementType.Wastage)
                .Select(m => new WastageMovementDto
                {
                    MovementId = m.MovementId,
                    ConsumableId = m.ConsumableId,
                    ConsumableName = m.Consumable != null ? m.Consumable.Name : (m.Tube != null ? m.Tube.Name : "N/A"),
                    ConsumableCategory = m.Consumable != null ? m.Consumable.Category : ConsumableCategory.Pathology,
                    Quantity = m.Quantity,
                    CostPerUnit = m.ConsumableLot != null ? m.ConsumableLot.CostPerUnit : (m.TubeLot != null ? m.TubeLot.CostPerUnit : 0),
                    MovementType = m.MovementType,
                    ReasonCode = m.ReasonCode,
                    MovedAt = m.MovedAt
                })
                .ToListAsync();
        }
        
        public async Task<IEnumerable<WastageMovementDto>> GetCalibrationCostAsync()
        {
            return await _context.ImsStockMovements
                .Where(m => m.MovementType == StockMovementType.Calibration)
                .Select(m => new WastageMovementDto
                {
                    MovementId = m.MovementId,
                    ConsumableId = m.ConsumableId,
                    ConsumableName = m.Consumable != null ? m.Consumable.Name : (m.Tube != null ? m.Tube.Name : "N/A"),
                    ConsumableCategory = m.Consumable != null ? m.Consumable.Category : ConsumableCategory.Pathology,
                    Quantity = m.Quantity,
                    CostPerUnit = m.ConsumableLot != null ? m.ConsumableLot.CostPerUnit : (m.TubeLot != null ? m.TubeLot.CostPerUnit : 0),
                    MovementType = m.MovementType,
                    ReasonCode = m.ReasonCode,
                    MovedAt = m.MovedAt
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<WastageMovementDto>> GetUnexplainedLossAsync()
        {
            return await _context.ImsStockMovements
                .Where(m => m.MovementType == StockMovementType.Adjustment || m.ReasonCode == WastageReasonCode.Other || m.ReferenceId == null)
                .Select(m => new WastageMovementDto
                {
                    MovementId = m.MovementId,
                    ConsumableId = m.ConsumableId,
                    ConsumableName = m.Consumable != null ? m.Consumable.Name : (m.Tube != null ? m.Tube.Name : "N/A"),
                    ConsumableCategory = m.Consumable != null ? m.Consumable.Category : ConsumableCategory.Pathology,
                    Quantity = m.Quantity,
                    CostPerUnit = m.ConsumableLot != null ? m.ConsumableLot.CostPerUnit : (m.TubeLot != null ? m.TubeLot.CostPerUnit : 0),
                    MovementType = m.MovementType,
                    ReasonCode = m.ReasonCode,
                    MovedAt = m.MovedAt
                })
                .ToListAsync();
        }
    }
}
