# 🔹 GEMINI PROMPT — DAY 16.4C-BRIDGE PATCH

## Legacy TubeLot ↔ ConsumableLot Wastage Bridge (Minimal Fix)

### CONTEXT

Manual wastage endpoint (`POST /api/v1/ims/stock/wastage`) currently fails for **legacy TubeLots**.

Observed behavior:

* `GET /api/v1/ims/stock/lots` returns TubeLots correctly
* `POST /api/v1/ims/stock/wastage` returns **404 Lot not found** for those same lotIds

Root cause:

* Wastage logic only queries **IMS_ConsumableLot**
* Legacy stock exists in **IMS_TubeLot**

This patch is to **bridge wastage support** for legacy TubeLots.

---

## 🎯 GOAL

Allow **manual wastage** to work for:

* Existing **IMS_TubeLot** (legacy)
* New **IMS_ConsumableLot** (future)

WITHOUT:

* Schema changes
* Migrations
* Refactors
* Breaking legacy flows

---

## 🔒 HARD GUARDRAILS

* ❌ No database schema changes
* ❌ No migrations
* ❌ No service signature changes
* ❌ No analytics
* ❌ No refactors outside wastage path
* ✅ Additive logic only
* ✅ Legacy behavior preserved

---

## ✅ REQUIRED BEHAVIOR

When handling `POST /api/v1/ims/stock/wastage`:

### Resolution logic (mandatory order)

1. Attempt to resolve `lotId` as **IMS_ConsumableLot**
2. If not found, attempt to resolve as **IMS_TubeLot**
3. If neither exists → return 404

---

## ✅ WASTAGE APPLICATION RULES

### If lot is `IMS_ConsumableLot`:

* Decrement `CurrentQuantity`
* Create `IMS_StockMovement`:

  * MovementType = WASTAGE
  * ConsumableId populated
  * ConsumableLotId populated
  * TubeId / TubeLotId = null

### If lot is `IMS_TubeLot`:

* Decrement `CurrentQuantity`
* Create `IMS_StockMovement`:

  * MovementType = WASTAGE
  * TubeId populated
  * TubeLotId populated
  * ConsumableId / ConsumableLotId = null

ReasonCode and Quantity must be recorded in both cases.

---

## 🧠 IMPORTANT SEMANTICS

* No assumption that TubeLot == ConsumableLot
* No cross-population of IDs
* No inference or conversion
* Just record **facts**

---

## 🛑 STOP CONDITION

Stop immediately after:

* Legacy TubeLot wastage succeeds
* Existing stock listing remains unchanged
* Sample collection still consumes stock correctly
* Build passes

Do not continue with enhancements or cleanups.

---

## 📌 FINAL NOTE

This is a **bridge**, not a migration.

The consumable abstraction will fully absorb legacy paths later.
Today’s goal is operational continuity.

Proceed with this patch now.

---
