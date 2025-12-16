# 🔹 GEMINI PROMPT — DAY 16.1 (PHASE 1)

## Tube-First Consumption Truth (Backend Only)

### CONTEXT

You are extending an existing production-grade DLMS backend called **SynOS**.
Core lab workflow is already stable up to **Sample = Collected**.

Existing confirmed flows:

* Visit → Payment → Sample auto-created
* `/samples/{id}/collect` endpoint works and updates sample status
* JWT identity, Branch, Test Master, Sample models already exist
* No schema drift, no FK issues

### 🎯 GOAL

Implement **tube-first automatic inventory consumption** so that:

* SynOS knows which tubes are required per test
* Stock is automatically reduced **exactly once** when a sample is collected
* Only low-stock alerts are exposed (no purchasing, no finance)

This phase must guarantee **consumption truth**.

---

### 🔒 STRICT GUARDRAILS (NON-NEGOTIABLE)

* Backend only (no UI, no frontend code)
* Do NOT add vendors, purchase orders, payments, GST, expiry, batch/lot, audits, analytics
* Consumption must trigger **only** when sample status changes to `Collected`
* Consumption must be **idempotent** (same sample must not deduct twice)
* Keep schema minimal and migration-safe

---

## 1️⃣ DATABASE SCHEMA (NEW TABLES ONLY)

### `IMS_TubeMaster`

Defines what the consumable is.

Fields:

* TubeId (PK)
* Code (unique, e.g., EDTA, SERUM)
* Name
* UnitOfMeasure (e.g., count)
* IsActive

---

### `IMS_TubeStock`

Tracks current stock **per branch**.

Fields:

* StockId (PK)
* TubeId (FK → IMS_TubeMaster)
* BranchId (FK → existing Branch)
* CurrentQuantity
* AlertQuantity   ← branch-specific threshold

---

### `IMS_TestTubeMap`

Defines which tube is required per test.

Fields:

* MapId (PK)
* SynOSTestCode (FK → existing TestDefinitions)
* TubeId (FK → IMS_TubeMaster)
* QuantityPerSample (usually 1)

---

### `IMS_TubeConsumption`

Tracks **actual consumption events** (truth record).

Fields:

* ConsumptionId (PK)
* SampleId (FK → existing Sample)
* TubeId (FK)
* Quantity
* ConsumedAt
* ConsumedByUserId

👉 Use this table to enforce idempotency:

* One sample → one consumption record

---

## 2️⃣ BUSINESS LOGIC (SERVICES)

### `ITubeConsumptionService`

#### `ConsumeStockOnSampleCollectedAsync(sampleId)`

Triggered from existing `/samples/{id}/collect` flow.

Logic:

1. Load Sample → Test(s) → Branch
2. Check if a consumption record already exists for this SampleId

   * If yes → return safely (do nothing)
3. Resolve required tubes via `IMS_TestTubeMap`
4. Reduce `IMS_TubeStock.CurrentQuantity`
5. Insert rows into `IMS_TubeConsumption`

---

#### `CheckLowStockAsync(branchId)`

* Returns tubes where `CurrentQuantity < AlertQuantity`

---

## 3️⃣ API CONTROLLERS

### `IMSTubeAdminController` (Authorize: Admin, LabTech)

* `POST /api/v1/ims/tubes`
* `PUT /api/v1/ims/tubes/{tubeId}`
* `POST /api/v1/ims/tubes/test-map`
* `POST /api/v1/ims/stock/seed`
  ⚠️ Temporary manual stock seeding (setup/testing only)

---

### `IMSStockReadController` (Authorize: StoreManager, LabTech)

* `GET /api/v1/ims/stock/summary`
* `GET /api/v1/ims/stock/low-alerts`

---

### ✅ EXIT CRITERIA

* Sample collected → stock reduces once and only once
* No negative stock unless manually seeded wrong
* Low-stock alerts accurate per branch