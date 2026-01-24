## 📌 Frontend Audit Closure Prompt – Reception UI (Final UX Cleanup)

**Context (DO NOT RE-INTERPRET):**

* Backend financial gaps are now CLOSED.
* All engines (Revenue, Spend, Cost Attribution, Ops) are wired.
* Frontend must remain a **renderer + commander only**.
* Receptionist must **never** see or infer backend business logic.

**Absolute mental rule:**

> Receptionist only cares about **checkout vs prepaid**.
> They do **not** care who owes whom internally.

---

## 🎯 Objective

Clean up **labels and presentation only** so the Reception UI is:

* Clear for a receptionist
* Consistent with backend truth
* Free from technical/business terminology
* Zero logic changes
* Zero API changes
* Zero flow changes

---

## ✅ Canonical Meanings (LOCK THESE)

Use these mappings everywhere in UI:

* **PartnerCollects** → **Prepaid**
* **LabCollects + Referral** → **Checkout**
* **No Referral** → **Checkout**

💡 Important:
“Checkout” simply means *patient pays at lab counter*.
It does NOT imply anything about commission, settlement, or partner payouts.

---

## 🔧 Required UI Changes (STRICTLY COSMETIC)

### 1️⃣ Replace technical payment labels

**Current (❌ wrong):**

* `PartnerCollects`
* `LabCollects`
* `Collection: PartnerCollects`

**Replace with (✅ correct):**

* If snapshot.billing.paymentModel === `PartnerCollects`
  → Show label/badge: **“Prepaid”**

* Else
  → Show label/badge: **“Checkout”**

⚠️ Do **NOT** show:

* PartnerCollects
* LabCollects
* Any backend terms
* Any explanation of who owes whom

---

### 2️⃣ Fix “Net Payable” wording

**Problem:**
UI shows “Net Payable” even when visit is already paid (Prepaid).

**Correct rendering rules:**

* If `snapshot.billing.status === 'Paid'`

  * Replace label **“Net Payable”** with:
    **“Total Bill Amount”**
  * DO NOT imply money is due

* Else

  * Use label:
    **“Amount to Collect”**

💡 Numbers remain unchanged.
Only the label changes.

---

### 3️⃣ Financials section behavior (no change, just confirm)

* Financials remain **read-only** until final confirmation.
* No new buttons.
* No “Mark as Paid” here.
* No new actions.

This section is **display-only**.

---

### 4️⃣ Referral UI (IMPORTANT: DO NOT CHANGE)

⚠️ This is a confirmation, not a change.

* Referral / Doctor input:

  * Always visible
  * Hybrid (dropdown + free text)
  * Already working correctly

Do **NOT**:

* Hide referral
* Rename referral
* Add new validation
* Add helper logic

Backend already interprets it correctly.

---

## 🚫 What you must NOT do

* ❌ Do NOT add any new logic
* ❌ Do NOT infer commission / settlement in UI
* ❌ Do NOT show partner balances
* ❌ Do NOT show receivables / payables
* ❌ Do NOT touch snapshot interpretation
* ❌ Do NOT redesign the flow again

---

## 🧪 Acceptance Checklist (Must pass)

* [ ] Receptionist sees **only** “Prepaid” or “Checkout”
* [ ] No backend terms visible
* [ ] Paid visit does NOT show “Payable”
* [ ] Checkout visit shows “Amount to Collect”
* [ ] All existing flows still work unchanged
* [ ] No new API calls added

---
