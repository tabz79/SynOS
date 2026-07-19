I will view the `ImsRoleMappingScreen.jsx` file to see how role-to-consumable mapping configuration is integrated into the frontend.

Viewed ImsRoleMappingScreen.jsx:1-250

I will check if there is a frontend UI for mapping tests to collection tubes.

Searched for "TubeMap"

I will search for tube-related API endpoints or routes in the frontend.

Searched for "/tube"

I will view the `IMSTubeAdminController.cs` file.

Viewed IMSTubeAdminController.cs:1-110

I will search the backend codebase for `ImsPurchaseOrder` to see how purchase orders and the receiving flow are structured.

Searched for "ImsPurchaseOrder"

I will search `App.jsx` for procurement routes to see if the procurement screens are connected to the navigation structure.

Searched for "Procurement"

I will search the frontend codebase for references to `ProcurementTerminal` to find if it is integrated into any layout or dashboard.

Searched for "ProcurementTerminal"

I will check the procurement features for any stock receiving actions.

Searched for "receive"

I will view the stock receiving code block in `InventoryTerminal.jsx`.

Viewed InventoryTerminal.jsx:555-600

I will search for `ReceiveStockDto` in the backend codebase to see if the database model supports linking stock receipts to purchase orders.

Searched for "class ReceiveStockDto"

I will view `ReceiveStockDto.cs` to check its fields.

Viewed ReceiveStockDto.cs:1-29

I will view the `PurchasingController.cs` file to see all the endpoints defined for purchase orders.

Viewed PurchasingController.cs:1-129

I will view `IMSPurchasingController.cs` to check if it implements any PO receiving endpoints.

Viewed IMSPurchasingController.cs:1-144

I will search for `PurchasingService` to locate the purchasing service implementation.

Searched for "class PurchasingService"

I will view `PurchasingService.cs` to analyze how stock is received against PO items.

Viewed PurchasingService.cs:1-263

# Inventory Pipeline Integration Audit

This audit evaluates the end-to-end connectivity of the SynOS inventory pipelines. It traces the workflows from frontend user actions to backend services, identifying duplicate databases/tables, disconnected APIs, and hardcoded logic.

---

## Final Report Summary

| Pipeline | Status | Key Findings |
| :--- | :--- | :--- |
| **Pipeline 1: Role → Allowed Inventory Items** | ✅ Fully Connected | Mappings configured in the UI are successfully stored in `ImsRoleItemMaps` and used to filter the default view in the "Request Stock" drawers. |
| **Pipeline 2: Inventory Request Workflow** | ✅ Fully Connected | The submission, approval, branch-level FIFO lot deduction, and stock movement auditing are fully wired. |
| **Pipeline 3: Test Consumable Mapping** | 🟡 Partially Connected | The backend schema and auto-deduction logic are operational, but the frontend configuration screens are missing, causing the system to run on a hardcoded fallback (`REAGENT-GEN`). |
| **Pipeline 4: Tube Consumption** | 🟡 Partially Connected | The phlebotomy tube deduction and negative stock logic are fully wired, but the test-to-tube mapping UI is missing. |
| **Pipeline 5: Inventory Lifecycle** | 🟡 Partially Connected | Severe structural split exists: receiving stock via Purchase Orders writes to a disconnected table (`ImsConsumableLots`) which is never consumed or audited in the stock ledger. |

---

## Detailed Pipeline Traces

### Pipeline 1: Role → Allowed Inventory Items
* **Trace:** `ImsRoleMappingScreen.jsx` $\rightarrow$ `ImsRoleItemMaps` (DB) $\rightarrow$ `StockRequestController.cs` $\rightarrow$ `StockRequestPanel.jsx` (UI Drawer)
* **Connectivity Audit:**
  * **Does the Request Inventory screen actually use these mappings?** Yes. [StockRequestPanel.jsx](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/src/SynOS.Frontend/src/features/inventory/StockRequestPanel.jsx) calls `InventoryApi.getAllowedItems()` on mount, which filters the list to show only the "Essential" items mapped to the logged-in user's role.
  * **Is "Search Entire Catalog" intentionally an escape hatch?** Yes. Clicking the toggle changes the state (`showAll`), querying the entire active catalog (`getAllActiveItems`) in case an item that isn't mapped needs to be requested.
  * **Are there any places where these mappings are ignored?** Yes. The backend `POST /api/v1/inventory/requests` accepts any valid consumable ID. Role filtering is strictly a frontend guidance feature and is not enforced as a hard security boundary in the API.

---

### Pipeline 2: Inventory Request Workflow
* **Trace:** `StockRequestPanel.jsx` (Request) $\rightarrow$ `IMS_StockRequests` (DB) $\rightarrow$ `PendingRequestsQueue.jsx` (Queue) $\rightarrow$ `ImsRequestService.FulfillRequestAsync` (Fulfillment) $\rightarrow$ `IMS_InventoryLots` (Stock Deducted) $\rightarrow$ `IMS_StockMovements` (Audit Ledger)
* **Connectivity Audit:**
  * Every step of this pipeline is **fully connected** and executes within an atomic database transaction. Fulfilling a request immediately deducts the quantity from the branch's active lots (using FIFO order by expiry date) and inserts an audit log into the movements table.

---

### Pipeline 3: Test Consumable Mapping
* **Trace:** `Test` $\rightarrow$ `ImsTestConsumableMap` (DB) $\rightarrow$ `ProcessingService.cs` $\rightarrow$ `ImsConsumptionService.ConsumeForTestAsync` $\rightarrow$ `IMS_InventoryLots` (Deduction)
* **Connectivity Audit:**
  * **Which parts already exist?** The DB mapping schema, the backend completion triggers, and the automatic FIFO deduction logic (including negative stock handling) all exist.
  * **Which parts are hardcoded?** 
    1. The frontend lacks any screens to link a test to a consumable, so the mapping database table is empty in production.
    2. When the backend workbench completes a test and finds no mappings in `ImsTestConsumableMaps`, it falls back to a hardcoded generic consumable: **`REAGENT-GEN`** (1.00 unit).
  * **Which parts are configuration-driven?** The deduction logic itself is dynamic; if mappings are manually inserted into the `IMS_TestConsumableMaps` table, the system will bypass the fallback and consume the correct mapped consumables and quantities.

---

### Pipeline 4: Tube Consumption
* **Trace:** `Test` $\rightarrow$ `ImsTestTubeMap` (DB) $\rightarrow$ `PhlebotomyService.cs` $\rightarrow$ `TubeConsumptionService.ConsumeStockForSpecimenAsync` $\rightarrow$ `ImsTubeLots` (Deduction)
* **Connectivity Audit:**
  * Similar to Pipeline 3, the backend is fully connected. Collecting a specimen triggers a query to `ImsTestTubeMaps` to locate the tube, deducts it from `ImsTubeLots` (handling negative stock and writing shortage events/notifications). However, the frontend UI to configure the test-to-tube mapping is **missing**.

---

### Pipeline 5: Inventory Lifecycle
* **Trace:** `ProcurementTerminal.jsx` (PO) $\rightarrow$ `IMSPurchasingController.cs` $\rightarrow$ `ImsConsumableLots` vs `IMS_InventoryLots` $\rightarrow$ `Stock Ledger`
* **Connectivity Audit:**
  * There is a **critical data split** between the Purchase Order workflow and the operational inventory flow:
    1. Receiving stock via the PO flow (`POST /api/v1/ims/purchase/receive/{poItemId}`) adds stock batches to the **`ImsConsumableLots`** table.
    2. Receiving stock manually in the inventory terminal writes batches to the **`IMS_InventoryLots`** table.
    3. The automatic consumption pipeline (`ImsConsumptionService.cs`) and the stock ledger/dashboard metrics **only read and deduct from the `IMS_InventoryLots` table**.
    4. Consequently, stock received via Purchase Orders is **never consumed** by normal lab workflows and is **never reflected** in the main stock ledger.

---

## Dead Code / Duplicate Logic

### 1. Disconnected / Duplicate Tables
* **`ImsConsumableLots` vs. `IMS_InventoryLots`:** Both track batch stock, but the main ledger and consumption services only target `IMS_InventoryLots`. `ImsConsumableLots` is dead-end data populated only by PO receipts.
* **`ImsTubeLots` vs. `IMS_InventoryLots`:** Duplicate lot tracking. Tube consumption is siloed in `ImsTubeLots` while general consumables are in `IMS_InventoryLots`.

### 2. Backend APIs with No Frontend UI
* **`GET/POST/DELETE /api/v1/testgovernance/{testId}/consumables`:** Manages test-to-consumable mappings.
* **`POST /api/v1/ims/tubes/test-map`:** Manages test-to-collection tube mappings.
* **`POST /api/v1/ims/stock/lot`:** Manages manual additions of legacy tube lots.

### 3. Hardcoded Consumables Usage
Several operational checkpoints bypass the mapping tables entirely and use hardcoded item codes:
* **Reception:** Hardcodes `RCT-RL` (Thermal receipt rolls) and `PEN-BL` (Pens).
* **Phlebotomy:** Hardcodes `SYR-5ML` (Syringes), `ALC-S` (Alcohol swabs), `GLV-L` (Gloves), `CTN-R` (Cotton), and `TUBE-EDTA` (EDTA tubes).
* **Delivery Desk:** Hardcodes `PPR-A4` (Paper) and `PEN-BL` (Pens).
* **Workbench Fallback:** Hardcodes `REAGENT-GEN` if a test lacks database mappings.

Gpt5:
This is a **very good audit**. More importantly, it tells us where **not** to spend time.

Here's my assessment.

---

# 🟢 Don't touch (Complete)

### 1. Role → Allowed Items

Done.

### 2. Inventory Request

Done.

### 3. Approval

Done.

### 4. FIFO Deduction

Done.

### 5. Stock Movement Ledger

Done.

These are V1 complete.

---

# 🟡 Finish

## Test → Consumable Mapping

Backend ✅

Database ✅

Consumption Engine ✅

Only UI ❌

This is probably a 1-day task.

---

## Test → Tube Mapping

Same story.

Backend ✅

Database ✅

Consumption Engine ✅

UI ❌

---

# 🔴 Biggest problem

This is the one I'd stop everything else for.

## Purchase Order

↓

ImsConsumableLots

BUT

Inventory

↓

IMS_InventoryLots

This is a broken pipeline.

Imagine buying ₹2 lakh worth of reagents.

Receiving them.

Inventory says

**0 stock**

because they went into another table.

That's not a missing feature.

That's a **bug in the architecture**.

I'd fix this before release.

---

# Another thing I noticed

This sentence worries me.

> Backend does NOT enforce Role Mapping.

Right now,

the UI hides items.

But the API accepts everything.

Meaning:

User can bypass the UI.

For V1 that's probably acceptable if all users use your official client, but if you're calling it "Role Mapping", I'd eventually enforce it server-side too. Not necessarily before release, but it's worth putting on the backlog.

---

# Hardcoded Consumption

I'm actually less worried than the audit is.

Why?

Because they're different categories.

### Operational

Reception

↓

Pen

↓

Thermal Roll

Those are okay to hardcode for V1 if they truly are fixed operational assumptions.

---

### Controlled

CBC

↓

Reagent

↓

Quantity

Those absolutely belong in configuration.

---

# I'd change only one thing

Instead of hardcoding

```text
Reception
↓

Pen
↓

Thermal Roll
```

I'd eventually make

```text
Role

↓

Allowed Items

↓

Optional Auto Consumption
```

Then the same mapping can serve both:

* What users can request.
* What gets consumed automatically, if desired.

That can wait until V2 if needed.

---

# My release blocker list

Only **three** items:

### 1. Fix Purchase Order → Inventory table split

**Critical**

---

### 2. Test Consumable Mapping UI

**Required**

---

### 3. Test Tube Mapping UI

**Required**

---

Everything else is enhancement.

---

I actually think your Inventory module is around **85–90% complete**. The architecture is stronger than it initially appeared—the main remaining work is **connecting existing pieces**, not inventing new ones. The biggest exception is the purchase-order split, because that affects data integrity and should be resolved before calling the module production-ready.
