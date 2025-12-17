# 🔹 GEMINI PROMPT — DAY 16.3

## Procurement & Cost Attribution (Backend Only)

### CONTEXT

Physical inventory is correct and FEFO-driven.

Lots exist.
Consumption works.
Now we **attach money to stock**, nothing more.

---

## 🎯 GOAL

Introduce procurement records so **every IMS_TubeLot has a real, auditable cost origin**.

This enables future cost-per-test calculations —
**without doing any financial analysis yet.**

---

## 🔒 HARD GUARDRAILS (NON-NEGOTIABLE)

* Backend only
* **NO analytics**
* **NO dashboards**
* **NO profit / loss / margin**
* **NO valuation math**
* **NO aggregation queries**
* **NO payment logic**
* Cost is **recorded**, never interpreted
* Each TubeLot must trace back to **exactly one PO item**

If you step outside this scope, STOP.

---

## 1️⃣ NEW SCHEMA (STRICT)

### `IMS_Supplier`

* SupplierId (PK)
* Name
* ContactInfo
* IsActive

❗ No calculated fields
❗ No totals
❗ No rollups

---

### `IMS_PurchaseOrder`

* POId (PK)
* SupplierId (FK)
* Status (Draft / Sent / Received)
* CreatedAt

❗ No invoice logic
❗ No payments
❗ No totals yet

---

### `IMS_POItem`

* POItemId (PK)
* POId (FK)
* TubeId (FK)
* OrderedQuantity
* ReceivedQuantity
* UnitPrice
* TaxRate

This is the **source of truth for cost**.

---

### UPDATE — `IMS_TubeLot`

Add:

* POItemId (FK, required)
* CostPerUnit (copied at receive time)

🔐 Rules:

* CostPerUnit is copied **once**
* Never recalculated
* Never inferred
* Never updated later

---

## 2️⃣ SERVICES

### `IPurchasingService`

Implement **only**:

* CreateSupplierAsync
* CreatePurchaseOrderAsync
* AddPOItemAsync
* ReceiveStockAsync

#### ReceiveStockAsync rules:

* Requires:

  * POItemId
  * LotNumber
  * ExpiryDate
  * ReceivedQuantity
* Must:

  * Create IMS_TubeLot
  * Copy UnitPrice → CostPerUnit
  * Update ReceivedQuantity on POItem
* Must NOT:

  * Do analytics
  * Do valuation
  * Do accounting logic

---

## 3️⃣ API CONTROLLER

### `IMSPurchasingController`

Only these endpoints:

* `POST /api/v1/ims/suppliers`
* `POST /api/v1/ims/purchase/order`
* `POST /api/v1/ims/purchase/order/{poId}/items`
* `POST /api/v1/ims/purchase/receive/{poItemId}`

---

## 🧠 FINAL RULE

This phase **records financial facts**.
It does **not interpret them**.

---

## COMPLETION CRITERIA

* Every TubeLot has:

  * POItemId
  * CostPerUnit
* Stock still consumes FEFO
* No analytics exist