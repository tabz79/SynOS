
## 🔥 BACKEND EXECUTION PROMPT — DISCOUNT + CORRECTION SYSTEM (SynOS)

### Context (Read Carefully — This Is Ground Truth)

You are working on **SynOS**, an OS-grade Diagnostic Lab Management System.

Key non-negotiables:

* Backend is the **single source of truth**
* Frontend is a **pure renderer**
* **Facts are never edited**
* Corrections are **new facts**, not mutations
* Revenue & Intelligence layers must stay mathematically correct forever

We already have:

* Visit
* Invoice
* Orders
* DiscountMaster (admin-owned)
* DiscountFact (applied snapshot)
* Action Queue is working and trusted

Now we are adding a **Correction Layer**.

---

## 🎯 Objective

Implement a **Correction System** that allows:

* Post-finalization corrections
* Test changes
* Discount changes
* Financial adjustments

…**without editing existing records**.

The **Token ID remains the same**.
The Visit is not duplicated.
All changes are additive, auditable, and reversible via math.

---

## 🧠 Core Principle

> Original facts are immutable.
> Corrections are appended and recalculated.

---

## 1️⃣ Domain Model — REQUIRED ENTITIES

### A. CorrectionFact (NEW)

Create a new entity:

**CorrectionFact**

* CorrectionId (Guid)
* VisitId (Guid)
* InvoiceId (Guid)
* CorrectionType (Enum)
* ReferenceId (Guid?) — e.g. old OrderId or DiscountFactId
* Payload (JSON) — what changed
* DeltaAmount (decimal, signed)
* CreatedBy (UserId)
* CreatedAt (UTC)
* Reason (string, optional)
* IsReversal (bool, default false)

**CorrectionType ENUM**

* AddTest
* RemoveTest
* ChangeDiscount
* PriceAdjustment
* TaxAdjustment (future-safe)

No business logic in entity.

---

### B. DiscountFact — CLARIFY BEHAVIOR (Do NOT delete)

DiscountFact remains:

* Snapshot of **what was applied at that time**
* Never mutated
* Never deleted

If discount changes → new **CorrectionFact**, not overwrite.

---

## 2️⃣ Correction Entry Points (Backend APIs)

### REQUIRED APIs

#### A. Enter Correction Mode

*(No DB write — state concept only)*

```http
GET /api/v1/visits/{visitId}/correction-context
```

Returns:

* Current Visit snapshot
* Invoice snapshot
* Applied DiscountFact(s)
* Existing CorrectionFacts

---

#### B. Apply Correction

```http
POST /api/v1/visits/{visitId}/corrections
```

Payload (example):

```json
{
  "correctionType": "ChangeDiscount",
  "newDiscountMasterId": "guid",
  "reason": "Wrong discount selected"
}
```

Rules:

* Validate visit exists
* Visit can be Finalized or PendingPayment
* Paid visits require explicit role check (do NOT implement role logic now; just scaffold)
* Create CorrectionFact
* DO NOT edit Visit, Invoice, Order, DiscountFact

---

## 3️⃣ Revenue Engine — CRITICAL CHANGE

### Modify Revenue Calculation Pipeline

Current:

```
Invoice = Orders - Discount + Tax
```

New:

```
BaseInvoice
+ Sum(CorrectionFacts.DeltaAmount)
= EffectiveInvoice
```

Rules:

* Original Invoice remains unchanged
* Corrections are applied *on top*
* Tax recalculated on effective net amount
* Intelligence layer reads **EffectiveInvoice**, not raw Invoice

---

## 4️⃣ Discount Correction Rules (Important)

* Receptionist selects from **active DiscountMaster only**
* Discount value ALWAYS comes from DiscountMaster
* Receptionist cannot enter numbers (except Owner special case — stub only)
* Changing discount:

  * Old DiscountFact remains
  * New DiscountFact created
  * CorrectionFact links old → new
  * DeltaAmount reflects net impact difference

---

## 5️⃣ Audit & Traceability (MANDATORY)

Every correction must:

* Be linked to UserId
* Have timestamp
* Preserve original data
* Be readable by:

  * Revenue Engine
  * Intelligence layer
  * Audit reports

No silent changes.

---

## 6️⃣ What NOT To Do (Strict)

❌ Do not edit existing Invoice rows
❌ Do not delete DiscountFact
❌ Do not update Order price directly
❌ Do not recompute history in place
❌ Do not let frontend calculate totals

---

## 7️⃣ Deliverables (In Order)

1. New entities + migrations:

   * CorrectionFact
   * Enum(s)

2. Correction write API (POST)

3. Correction read API (GET context)

4. Revenue Engine update to include corrections

5. Unit-level safeguards (not tests, just guard clauses)

---

## 8️⃣ Final Check Question (You Must Answer)

Before finishing, explicitly confirm:

> “Can the system explain *why* a number changed without erasing history?”

If the answer is **NO**, you implemented it wrong.

---

### END OF PROMPT

---


