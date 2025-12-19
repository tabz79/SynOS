# 🔹 GEMINI PROMPT — **DAY 16.5C-1**

## Generic Inventory Identity + Usage Profile (FOUNDATION ONLY)

---

## ⚠️ READ FIRST — NON-NEGOTIABLE

This task builds **FOUNDATIONAL MODELS ONLY**.

You MUST NOT:

* Touch stock movements
* Touch lots
* Touch cost
* Touch billing
* Touch analytics
* Touch existing services
* Touch existing controllers

If you do → **STOP AND REPORT VIOLATION**

---

## 🎯 GOAL

Allow SynOS to **identify ANY inventory item** and let admins define **how it behaves**, without affecting operations yet.

This applies to:

* Pathology
* Radiology
* CT / MRI / XRAY
* Any future department

---

## 🧠 CORE PRINCIPLE (DO NOT VIOLATE)

**Identity ≠ Behavior**

Inventory identity and usage behavior MUST be separate entities.

---

## 🔒 HARD GUARDRAILS

* Backend only
* Additive schema only
* No refactors
* No logic execution
* No deductions
* No inference

---

## 1️⃣ GENERIC INVENTORY IDENTITY

Create a generic inventory identity entity.

### `IMS_InventoryItem`

Fields:

* ItemId (PK)
* Code
* Name
* Category (string, open-ended)
* BaseUnitOfMeasure (string)
* IsActive
* CreatedAt

Rules:

* Represents **what the item is**
* No medical logic
* No consumption logic
* No cost logic

---

## 2️⃣ INVENTORY USAGE PROFILE (BEHAVIOR CONFIG)

Create a **separate** admin-defined behavior entity.

### `IMS_InventoryUsageProfile`

One-to-one with InventoryItem.

Fields:

* ItemId (FK)
* ItemType (string or enum: Reagent, Tube, Contrast, Film, EquipmentConsumable, Other)
* ConsumptionBasis (enum: PerTest, PerSample, PerStudy, ManualOnly)
* DefaultQuantityPerEvent
* QuantityUnit
* AllowsFractionalConsumption (bool)
* RequiresLotTracking (bool)
* AffectsTestCost (bool)

Rules:

* Configuration only
* No execution
* No deduction
* No validation logic

---

## 3️⃣ ADMIN EXTENSIBILITY (REQUIRED)

Admins must be able to:

* Add ANY inventory item
* Define its usage profile
* Change behavior without code changes

⚠️ No API controllers yet — models and DbContext only.

---

## 🛑 STOP CONDITION (16.5C-1)

You MUST stop when:
✅ Inventory items can be defined
✅ Usage behavior is configurable
✅ Nothing else changes