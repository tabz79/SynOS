---

### 🔹 GEMINI PROMPT — DAY 16.4D-PATCH

## Fix Semantic Violations in Wastage Summary (READ-ONLY PATCH)

### CONTEXT

Day 16.4D wastage summary endpoint is **functionally correct**, but has **semantic violations** that must be fixed **without refactor**.

Current behavior issues:

* `totalCost = 0` is returned even when cost is unknown
* `ConsumableCategory` is inferred for legacy `ImsTubeLot`
* Legacy TubeLots are implicitly treated as Consumables

These violate **no-inference / no-assumption** rules.

---

### 🎯 GOAL

Correct **semantic meaning** of the wastage summary output
**without changing behavior, schema, or analytics scope**.

---

### 🔒 HARD GUARDRAILS

* READ-ONLY
* NO new migrations
* NO new tables
* NO business logic
* NO analytics expansion
* Do NOT touch:

  * Stock movement recording
  * Quantity math
  * Existing controllers outside wastage summary

---

### 1️⃣ COST HANDLING FIX

**Rule:**

If cost **cannot be derived from the lot**, then:

* `totalCost` MUST be:

  * `null`
    **NOT** `0`

`0` implies “known zero”, which is false.

Apply this rule for:

* Legacy `ImsTubeLot`
* Any movement without `CostPerUnit`

---

### 2️⃣ CATEGORY & ID INFERENCE FIX

**Rule:**

For **legacy TubeLots**:

* Do NOT infer:

  * `ConsumableCategory`
  * `ConsumableId`

Instead:

* `ConsumableId = null`
* `ConsumableCategory = null`
* `ConsumableName` may be populated from TubeMaster **explicitly**

For **true ConsumableLots**:

* Populate fields normally

---

### 3️⃣ RESPONSE CONTRACT (IMPORTANT)

The API response must represent **truth, not convenience**:

* `null` means unknown
* Absence means not applicable
* Never guess or map implicitly

---

### ✅ STOP CONDITION

After patch:

* Endpoint still returns 200
* Quantities unchanged
* No new data written
* No assumptions encoded
* Semantics match real-world facts

---

### ❗ FINAL WARNING

Do NOT:

* Merge TubeLots into Consumables
* Add analytics logic
* Add cost math
* Add dashboards

This is a **semantic correction only**.

Stop after patch and confirm build success.

---

That’s the patch. It’s intentionally boring — that’s good.

---