# 🔹 GEMINI PROMPT — DAY 16.2 (PHASE 2)

## Lot + Expiry Physical Reality (Backend Only)

---

## CONTEXT

Day 16.1 is **completed, tested, and stable**.

* Tube-first consumption works
* Stock is deducted **only** when a sample is collected
* Consumption is derived from **Test → Tube mapping**
* Payment and visit flows are untouched

Now we introduce **physical truth**:

* Batch / Lot
* Expiry
* FEFO consumption

This phase adds **physical correctness**, not financial logic.

---

## 🎯 GOAL

Track **which physical tubes** are consumed and **when they expire**, while preserving all guarantees from Day 16.1.

---

## 🔒 GUARDRAILS (STRICT)

* Backend only (no UI, no React, no CSS)
* Do NOT add:

  * Vendors
  * Purchase Orders
  * Payments
  * GST
  * Valuation
  * Analytics dashboards
* Consumption MUST prioritize **FEFO** (earliest expiry first)
* Wastage is allowed **only** for expiry or damage
* Phase-1 behavior MUST remain unchanged

---

## 1️⃣ SCHEMA CHANGES

### ❌ DELETE

* `IMS_TubeStock`

(No aggregated stock table is allowed in this phase.)

---

### ➕ ADD — `IMS_TubeLot`

Tracks **actual physical stock**.

Fields:

* `LotId` (PK)
* `TubeId` (FK → IMS_TubeMaster)
* `BranchId` (FK → existing Branch resolution)
* `LotNumber`
* `ExpiryDate`
* `CurrentQuantity`
* `ReceivedAt`
* `IsActive`

⚠️ Notes:

* `IsActive` is **derived**, not manually controlled.
* A lot is **inactive** if:

  * `CurrentQuantity == 0`, OR
  * `ExpiryDate < Now`

---

### ➕ ADD — `IMS_StockMovement`

Immutable stock ledger.

Fields:

* `MovementId` (PK)
* `TubeId` (FK)  ← denormalized for reporting
* `LotId` (FK)
* `Quantity` (ALWAYS positive)
* `MovementType` (Consumption / Wastage)
* `ReferenceId` (SampleId or ManualRef)
* `MovedAt`

⚠️ Rules:

* Quantity is **never negative**
* Direction is inferred only from `MovementType`
* Rows are **append-only** (never updated or deleted)

---

## 2️⃣ SERVICE UPDATES

### `ConsumeStockOnSampleCollectedAsync(sampleId)`

This method replaces Phase-1 stock deduction logic.

#### REQUIRED LOGIC (NO DEVIATION):

1. Resolve `BranchId` strictly via:

   ```
   Sample → Visit → BranchId
   ```

   ❌ No defaults
   ❌ No inference from user
   ❌ No global fallback

2. Resolve required `TubeId(s)` via:

   ```
   Test → Tube mapping
   ```

   ⚠️ MUST NOT use `Sample.TubeType`

3. Query **active lots** for that tube & branch:

   ```
   ORDER BY ExpiryDate ASC, ReceivedAt ASC
   ```

4. Deduct required quantity across lots (FEFO):

   * Consume from earliest expiring lot first
   * Spill into next lot only if needed

5. For each deduction:

   * Reduce `IMS_TubeLot.CurrentQuantity`
   * Insert one `IMS_StockMovement` row (Consumption)
   * ReferenceId = SampleId

6. Operation must be **idempotent**

   * Same sample must NEVER deduct twice

---

### `GetNearExpiryAlertsAsync(branchId, days)`

Returns lots where:

```
ExpiryDate <= Today + days
AND CurrentQuantity > 0
```

---

### `RecordWastageAsync(lotId, quantity, reason)`

* Deduct quantity from the specified lot
* Create `IMS_StockMovement` with:

  * MovementType = Wastage
  * ReferenceId = reason
* Must NOT allow quantity to go negative

---

### `AddStockManualAsync(...)`

Temporary bypass for testing and early ops.

Rules:

* Admin-only
* Creates a new `IMS_TubeLot`
* MUST create a corresponding `IMS_StockMovement`
* Explicitly marked as **temporary**
* No cost, no PO, no valuation

---

## 3️⃣ API CONTROLLERS

### `IMSStockOperationController`

* `POST /api/v1/ims/stock/lot`

  * Manual lot creation (Admin only)
* `POST /api/v1/ims/stock/lot/{lotId}/wastage`

  * Record wastage

---

### `IMSStockReadController`

* `GET /api/v1/ims/stock/lots`

  * Returns active & inactive lots
* `GET /api/v1/ims/stock/expiry-alerts?days=7|14|21`

---

## 4️⃣ CLARIFICATIONS & INVARIANTS (DO NOT IGNORE)

* BranchId MUST come from Sample → Visit → Branch
* FEFO ordering = ExpiryDate ASC, then ReceivedAt ASC
* Sample.TubeType MUST NOT be used
* StockMovement.Quantity is always positive
* IsActive is derived, not manually toggled
* Manual stock add MUST be auditable via StockMovement
* Phase-1 behavior MUST remain unchanged

---

## ✅ EXIT CRITERIA

* FEFO is strictly enforced
* Consumption is traceable to **lot level**
* Expired stock is visible
* No regression in Day 16.1 behavior

---

### 🚫 EXPLICITLY OUT OF SCOPE

* Reagents
* Cost per test
* Supplier management
* Purchasing
* Capital allocation
* AI / analytics

---

### FINAL INSTRUCTION TO GEMINI

Implement **only** what is defined above.
Do not introduce additional abstractions, shortcuts, or assumptions.

---

