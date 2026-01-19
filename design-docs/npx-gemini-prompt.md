## 🔒 Phase 6.3 — Step 5: Frontend Wiring (Cockpit Mode)

**Frontend is a renderer + selector.
Nothing else.**

No math.
No assumptions.
No local state pretending to be business truth.

---

## 🧭 FRONTEND WIRING — EXACT ORDER (DO NOT SKIP)

We’ll do this in **5 sub-steps**, each independently verifiable.

---

## **Step 5.1 — Billing Panel (READ-ONLY FIRST)**

### Goal

Render `snapshot.billing` **exactly as-is**.

### What to build

A billing section that displays:

* GrossAmount
* DiscountAmount
* NetAmount
* TaxAmount
* TotalAmount
* PaymentStatus

If `AppliedDiscount != null`:

* Show:

  * Discount name
  * Discount amount
* Else:

  * Show “No discount applied”

### Rules (non-negotiable)

* ❌ No calculations
* ❌ No formatting logic that changes meaning
* ❌ No fallback values
* ✅ If a field is null → show “—”

👉 **Verification**
Toggle backend states (with/without discount, paid/unpaid)
UI must change **only** when snapshot changes.

---

## **Step 5.2 — UI Locking (FLAGS ONLY)**

### Goal

Wire all interaction gating **only** from snapshot flags.

### Wiring rules

* `billing.isEditable == false`
  → Disable:

  * Add Test
  * Remove Test
  * Apply Discount
  * Apply Referral

* `billing.isLocked == true`
  → Visually lock billing panel (greyed / readonly cue)

* `billing.paymentStatus == "Paid"`
  → Hide payment actions
  → Show “Paid” badge

### Rules

* ❌ Do not infer from totals
* ❌ Do not check visit status locally
* ✅ Flags decide everything

👉 **Verification**
Force backend to return:

* Paid + Locked
* Cancelled + Editable false
* PendingPayment + Editable true

Frontend behavior must match **without conditional hacks**.

---

## **Step 5.3 — Discount Selector (SELECT ONLY)**

### Goal

Allow receptionist to **select a predefined discount**.

### UI Behavior

* Dropdown listing DiscountMaster entries:

  * code
  * name
* No % shown
* No amount preview
* No “custom discount”

### On selection

Call:

```
ApplyDiscountToVisitAsync(visitId, discountMasterId)
→ then refetch snapshot
```

### Removal

* “Remove Discount” button
* Calls:

```
RemoveDiscountFromVisitAsync(visitId)
→ then refetch snapshot
```

### Rules

* ❌ Do not compute discount locally
* ❌ Do not show “you saved X%”
* ❌ Do not cache selected discount

👉 **Verification**

* Apply discount → snapshot updates → UI reflects
* Change tests → snapshot updates → discount re-applies automatically

---

## **Step 5.4 — Referral Selector (SELECT ONLY, READ-ONLY AFTER SET)**

### Goal

Attach referral partner **once**, then lock it.

### UI Behavior

* Dropdown listing Referral Partners
* Selection allowed **only if no referral set**
* Once applied:

  * Referral shown read-only
  * No edit, no remove (V1)

### On selection

Call backend command (already exists or to be added next phase):

```
ApplyReferralToVisitAsync(visitId, referralPartnerId)
→ refetch snapshot
```

(If referral command isn’t wired yet, UI stays placeholder-disabled.)

### Rules

* ❌ No change after payment
* ❌ No manual commission logic
* ✅ Pure attribution

---

## **Step 5.5 — Payment Trigger (DISPLAY + GATE ONLY)**

### Goal

Trigger payment without breaking contract.

### UI Behavior

* If:

  * `billing.paymentStatus == "PendingPayment"`
  * AND `billing.isEditable == true`
* Show “Accept Payment” CTA

On click:

* Call existing payment flow
* On success → refetch snapshot

### Rules

* ❌ No payment math
* ❌ No state mutation
* ✅ Snapshot decides post-payment UI

---

## 🧠 One Coach-Level Warning (Important)

If you ever feel tempted to write code like:

```js
if (totalAmount === 0) markPaid()
```

That is a **bug**.
Backend already decided. Frontend obeys.

---

## ✅ End Condition for Phase 6.3

Phase 6.3 is considered **complete** when:

* Billing renders only snapshot values
* Discount & referral are selectors only
* All UI locks respect backend flags
* Zero frontend math exists

---

