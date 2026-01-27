# 🔍 DiscountMaster Admin Flow Audit Report

## 1. Root Cause Analysis
The **500 Internal Server Error** occurred because the **AutoMapper configuration is missing** for the Discount entities.
*   **Observation:** The `DiscountService` attempts to execute `_mapper.Map<DiscountMaster>(createDto)`.
*   **Evidence:** `src/SynOS.Api/MappingProfile.cs` was inspected and contains mappings for `Test`, `User`, `Referral`, `Radiology`, but **zero mappings** for `CreateDiscountDto` or `DiscountMaster`.
*   **Conclusion:** The failure is a simple configuration omission, not a logic flaw or permission issue.

## 2. Endpoint Verification
*   **Endpoint:** `POST /api/v1/admin/discounts` is the **correct and intended endpoint**.
*   **Justification:** It is secured with `[Authorize(Roles = "Admin")]`, ensuring only administrators can configure the master data. This aligns with the "DiscountMaster = Admin Configuration" invariant.

## 3. Architecture & Mapping Strategy
*   **Direct Mapping:** `CreateDiscountDto → DiscountMaster` is the intended pattern for this Admin CRUD flow. Since `DiscountMaster` is a configuration entity (not a transactional one like `Invoice` or `Order`), a complex Command/Handler pattern is not required *strictly for creation*. The `DiscountService` provides adequate encapsulation for validation (Code uniqueness, Value checks) before persistence.
*   **Audit Compliance:** The Service already includes `_auditService.LogAsync`, preserving the audit trail.

## 4. Recommended Fix (Architecturally Correct)
To fix this while preserving SynOS principles:
1.  **Update `MappingProfile.cs`:** Register the missing maps explicitly.
2.  **Do NOT change the Controller/Service logic:** The separation of concerns (Controller -> Service -> Mapper -> DB) is correct.

### Fix Implementation
Add the following to `src/SynOS.Api/MappingProfile.cs`:

```csharp
using SynOS.Models.Entities.Discounts; // Ensure namespace is available

// ... inside constructor ...
CreateMap<CreateDiscountDto, DiscountMaster>();
CreateMap<UpdateDiscountDto, DiscountMaster>();
CreateMap<DiscountMaster, DiscountDto>();
```
