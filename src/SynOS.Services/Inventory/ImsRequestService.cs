using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.IMS;
using SynOS.Models.Entities;
using SynOS.Models.Entities.IMS;
using SynOS.Models.Enums.IMS;

namespace SynOS.Services.Inventory
{
    public class ImsRequestService : IImsRequestService
    {
        private readonly SynOSDbContext _context;

        public ImsRequestService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ConsumableSummaryDto>> GetAllowedItemsForRoleAsync(Guid roleId)
        {
            var role = await _context.Roles.FindAsync(roleId);
            var roleName = role?.Name ?? "";

            // 1. Explicit Custom Role Mappings
            var customMappings = await _context.ImsRoleItemMaps
                .Where(m => m.RoleId == roleId)
                .Include(m => m.Consumable)
                .ToListAsync();

            var resultDict = new Dictionary<Guid, ConsumableSummaryDto>();

            foreach (var m in customMappings)
            {
                if (m.Consumable == null) continue;
                
                var invItem = await _context.ImsInventoryItems.FirstOrDefaultAsync(i => i.ItemId == m.ConsumableId || i.ItemCode == m.Consumable.Code);

                resultDict[m.ConsumableId] = new ConsumableSummaryDto
                {
                    ConsumableId = m.ConsumableId,
                    Code = m.Consumable.Code,
                    Name = m.Consumable.Name,
                    Category = m.Consumable.Category.ToString(),
                    ServiceArea = invItem?.ServiceArea ?? "Laboratory",
                    Modality = invItem?.Modality ?? "",
                    OriginType = "Custom",
                    DerivedFromTestName = null,
                    UnitOfMeasure = m.Consumable.UnitOfMeasure,
                    LowStockThreshold = m.Consumable.LowStockThreshold,
                    IsActive = m.Consumable.IsActive
                };
            }



            // 2. Auto-Derived Test Master Mappings
            var testConsumables = await _context.ImsTestConsumableMaps
                .Include(tc => tc.Test)
                    .ThenInclude(t => t.DepartmentMaster)
                .Include(tc => tc.Consumable)
                .ToListAsync();

            foreach (var tc in testConsumables)
            {
                if (tc.Consumable == null || tc.Test == null) continue;
                if (resultDict.ContainsKey(tc.ConsumableId)) continue;

                var deptName = tc.Test.DepartmentMaster?.Name ?? tc.Test.Category ?? "";
                bool isRelevantRole = IsRoleRelevantForTest(roleName, deptName, tc.Test.TestName);
                if (isRelevantRole)
                {
                    var invItem = await _context.ImsInventoryItems.FirstOrDefaultAsync(i => i.ItemId == tc.ConsumableId || i.ItemCode == tc.Consumable.Code);

                    resultDict[tc.ConsumableId] = new ConsumableSummaryDto
                    {
                        ConsumableId = tc.ConsumableId,
                        Code = tc.Consumable.Code,
                        Name = tc.Consumable.Name,
                        Category = tc.Consumable.Category.ToString(),
                        ServiceArea = invItem?.ServiceArea ?? (deptName.Contains("Radiology") ? "Radiology" : "Laboratory"),
                        Modality = invItem?.Modality ?? "",
                        OriginType = "AutoDerived",
                        DerivedFromTestName = tc.Test.TestName,
                        UnitOfMeasure = tc.Consumable.UnitOfMeasure,
                        LowStockThreshold = tc.Consumable.LowStockThreshold,
                        IsActive = tc.Consumable.IsActive
                    };
                }
            }

            return resultDict.Values;
        }

        private static bool IsRoleRelevantForTest(string roleName, string department, string testName)
        {
            if (string.IsNullOrEmpty(roleName)) return true;

            var r = roleName.ToLowerInvariant();
            var d = (department ?? "").ToLowerInvariant();
            var t = (testName ?? "").ToLowerInvariant();

            if (r.Contains("admin") || r.Contains("manager") || r.Contains("owner")) return true;

            if (r.Contains("xray") || r.Contains("x-ray")) return d.Contains("radiology") || t.Contains("x-ray") || t.Contains("xray");
            if (r.Contains("mri")) return d.Contains("radiology") || t.Contains("mri");
            if (r.Contains("ct")) return d.Contains("radiology") || t.Contains("ct");
            if (r.Contains("us") || r.Contains("ultrasound")) return d.Contains("radiology") || t.Contains("ultrasound") || t.Contains("us");
            if (r.Contains("radiolog")) return d.Contains("radiology");

            if (r.Contains("lab") || r.Contains("patholog") || r.Contains("phlebotom") || r.Contains("technician"))
            {
                return !d.Contains("radiology");
            }

            return true;
        }

        public async Task AddMappingAsync(Guid roleId, Guid consumableId)
        {
            var exists = await _context.ImsRoleItemMaps.AnyAsync(m => m.RoleId == roleId && m.ConsumableId == consumableId);
            if (exists) return;

            _context.ImsRoleItemMaps.Add(new ImsRoleItemMap
            {
                RoleId = roleId,
                ConsumableId = consumableId
            });
            await _context.SaveChangesAsync();
        }

        public async Task RemoveMappingAsync(Guid roleId, Guid consumableId)
        {
            var map = await _context.ImsRoleItemMaps.FirstOrDefaultAsync(m => m.RoleId == roleId && m.ConsumableId == consumableId);
            if (map == null) return;

            _context.ImsRoleItemMaps.Remove(map);
            await _context.SaveChangesAsync();
        }

        public async Task<Guid> CreateRequestAsync(CreateStockRequestDto dto, Guid requestedByUserId)
        {
            var requestingUser = await _context.Users.FirstOrDefaultAsync(u => u.UserId == requestedByUserId);
            var targetBranchId = (dto.BranchId != Guid.Empty && await _context.Branches.AnyAsync(b => b.BranchId == dto.BranchId))
                ? dto.BranchId
                : (requestingUser?.DefaultBranchId ?? (await _context.Branches.Select(b => b.BranchId).FirstOrDefaultAsync()));

            if (targetBranchId == Guid.Empty)
            {
                throw new InvalidOperationException("No valid branch found for stock request.");
            }

            var request = new ImsStockRequest
            {
                RequestId = Guid.NewGuid(),
                ConsumableId = dto.ConsumableId,
                Quantity = dto.Quantity,
                BranchId = targetBranchId,
                RequestedByUserId = requestedByUserId,
                RequestedFromScreen = string.IsNullOrWhiteSpace(dto.RequestedFromScreen) ? "Reception" : dto.RequestedFromScreen,
                RequesterRole = string.IsNullOrWhiteSpace(dto.RequesterRole) ? "Admin" : dto.RequesterRole,
                RequestedAt = DateTimeOffset.UtcNow,
                Status = ImsRequestStatus.Pending
            };

            _context.ImsStockRequests.Add(request);
            await _context.SaveChangesAsync();

            return request.RequestId;
        }

        public async Task<IEnumerable<StockRequestSummaryDto>> GetPendingRequestsAsync(Guid branchId)
        {
            var rawList = await _context.ImsStockRequests
                .Include(r => r.Consumable)
                .Include(r => r.RequestedByUser)
                    .ThenInclude(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                .Include(r => r.Branch)
                .Where(r => r.BranchId == branchId && r.Status == ImsRequestStatus.Pending)
                .ToListAsync();

            return rawList.Select(r => new StockRequestSummaryDto
            {
                RequestId = r.RequestId,
                ConsumableId = r.ConsumableId,
                ConsumableName = r.Consumable?.Name ?? "Consumable Item",
                UnitOfMeasure = r.Consumable?.UnitOfMeasure ?? "units",
                Quantity = r.Quantity,
                BranchId = r.BranchId,
                BranchName = r.Branch?.Name ?? "Main Lab",
                RequestedByUserId = r.RequestedByUserId,
                RequestedByUserName = r.RequestedByUser?.Name ?? r.RequestedByUser?.Username ?? "Staff User",
                RequestedByUserRole = !string.IsNullOrWhiteSpace(r.RequesterRole) 
                    ? r.RequesterRole 
                    : (r.RequestedByUser?.UserRoles?.FirstOrDefault()?.Role?.Name ?? "Admin"),
                RequestedFromScreen = !string.IsNullOrWhiteSpace(r.RequestedFromScreen) ? r.RequestedFromScreen : "Reception",
                RequestedAt = r.RequestedAt,
                Status = r.Status
            });
        }

        public async Task<IEnumerable<StockRequestSummaryDto>> GetAllPendingRequestsAsync()
        {
            var rawList = await _context.ImsStockRequests
                .Include(r => r.Consumable)
                .Include(r => r.RequestedByUser)
                    .ThenInclude(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                .Include(r => r.Branch)
                .Where(r => r.Status == ImsRequestStatus.Pending)
                .ToListAsync();

            return rawList.Select(r => new StockRequestSummaryDto
            {
                RequestId = r.RequestId,
                ConsumableId = r.ConsumableId,
                ConsumableName = r.Consumable?.Name ?? "Consumable Item",
                UnitOfMeasure = r.Consumable?.UnitOfMeasure ?? "units",
                Quantity = r.Quantity,
                BranchId = r.BranchId,
                BranchName = r.Branch?.Name ?? "Main Lab",
                RequestedByUserId = r.RequestedByUserId,
                RequestedByUserName = r.RequestedByUser?.Name ?? r.RequestedByUser?.Username ?? "Staff User",
                RequestedByUserRole = !string.IsNullOrWhiteSpace(r.RequesterRole) 
                    ? r.RequesterRole 
                    : (r.RequestedByUser?.UserRoles?.FirstOrDefault()?.Role?.Name ?? "Admin"),
                RequestedFromScreen = !string.IsNullOrWhiteSpace(r.RequestedFromScreen) ? r.RequestedFromScreen : "Reception",
                RequestedAt = r.RequestedAt,
                Status = r.Status
            });
        }

        public async Task FulfillRequestAsync(Guid requestId, Guid adminUserId)
        {
            var request = await _context.ImsStockRequests
                .Include(r => r.Consumable)
                .FirstOrDefaultAsync(r => r.RequestId == requestId);

            if (request == null) throw new KeyNotFoundException("Request not found");
            if (request.Status != ImsRequestStatus.Pending) throw new InvalidOperationException("Request is not pending");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Mark request as fulfilled
                request.Status = ImsRequestStatus.Fulfilled;
                request.FulfilledByUserId = adminUserId;
                request.FulfilledAt = DateTimeOffset.UtcNow;

                // 2. Find the associated Inventory Item for this consumable
                var inventoryItem = await _context.ImsInventoryItems
                    .FirstOrDefaultAsync(i => i.ItemCode == request.Consumable.Code);

                if (inventoryItem == null)
                {
                    throw new InvalidOperationException($"No Inventory Item found with code {request.Consumable.Code}");
                }

                // 3. Find active lots for this item in the specific branch
                var activeLots = await _context.ImsInventoryLots
                    .Where(l => l.ItemId == inventoryItem.ItemId && l.BranchId == request.BranchId && l.IsActive && l.CurrentQuantity > 0)
                    .OrderBy(l => l.ExpiryDate) // FIFO by expiry
                    .ToListAsync();

                if (activeLots.Sum(l => l.CurrentQuantity) < request.Quantity)
                {
                    throw new InvalidOperationException("Insufficient stock in branch to fulfill request");
                }

                int remainingToDeduct = request.Quantity;

                foreach (var lot in activeLots)
                {
                    if (remainingToDeduct <= 0) break;

                    int deduction = (int)Math.Min((decimal)remainingToDeduct, lot.CurrentQuantity);
                    lot.CurrentQuantity -= deduction;
                    remainingToDeduct -= deduction;

                    // 4. Log the movement as RequestFulfillment
                    // Using the new InventoryLotId field for enterprise-grade traceability
                    var movement = new ImsStockMovement
                    {
                        MovementId = Guid.NewGuid(),
                        ConsumableId = request.ConsumableId,
                        InventoryLotId = lot.LotId, // Correctly linked to the new system
                        ConsumableLotId = null,      // Legacy field
                        Quantity = deduction,
                        MovementType = StockMovementType.RequestFulfillment,
                        ReferenceType = MovementReferenceType.StockRequest,
                        ReferenceId = request.RequestId.ToString(),
                        RecordedByUserId = adminUserId,
                        MovedAt = DateTimeOffset.UtcNow
                    };
                    _context.ImsStockMovements.Add(movement);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task IgnoreRequestAsync(Guid requestId)
        {
            var request = await _context.ImsStockRequests.FindAsync(requestId);
            if (request == null) throw new KeyNotFoundException("Request not found");
            
            request.Status = ImsRequestStatus.Ignored;
            await _context.SaveChangesAsync();
        }
    }
}
