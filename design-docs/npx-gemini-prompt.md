## 🔹 GEMINI PROMPT — **IMPLEMENTATION 16.8 A.i**

### Revenue Engine — RevenueFact Truth Definition

---

### ⚠️ READ FIRST — NON-NEGOTIABLE

You are defining the **Revenue Engine truth model**.

This engine records **money inflow facts only**.

You MUST NOT:

* Calculate totals
* Infer revenue
* Validate against other engines
* Reference Spend, Inventory, Tests, Billing, or Pricing
* Add business logic
* Add analytics fields
* Add derived or computed columns
* Modify or delete facts
* “Optimize” the design

This is a **write-only, append-only truth engine**.

---

### 🎯 OBJECTIVE

Define the **RevenueFact data model** that represents **one real-world declaration that money was received**.

This is a **fact contract**, not a reporting model.

---

### 🧱 CORE PRINCIPLES (DO NOT VIOLATE)

* One RevenueFact = one inflow declaration
* Truth ≠ correctness
* Facts come from reality, not inference
* If money was received outside the system, it is still recorded here
* Refunds / chargebacks are recorded as **new facts**, never mutations

---

### 📦 REQUIRED OUTPUT

Produce:

1. **RevenueFact entity definition**

   * Field name
   * Type
   * Short description
   * Whether immutable (yes for almost all)

2. Supporting enums (if needed), strictly minimal:

   * RevenueDirection
   * RevenueSourceType
   * PaymentMode

3. Explicitly list:

   * What RevenueFact IS
   * What RevenueFact IS NOT

---

### 📌 REQUIRED FIELDS (MINIMUM — DO NOT REMOVE)

Your model MUST include these fields:

* RevenueFactId (immutable)
* OccurredAt (when money actually entered)
* DeclaredAt (when system was told)
* Amount
* Currency
* Direction (INFLOW / REVERSAL)
* SourceType (Patient / Corporate / Insurance / Other)
* SourceReferenceId (opaque string, not interpreted)
* PaymentMode (Cash / UPI / Card / Bank / Other)
* DeclaredByUserId
* Notes (optional, never parsed)

You MAY add **only** fields that strengthen auditability
(eg. CreatedAt, ExternalReferenceId)
—but you must justify each one.

---

### 🚫 HARD EXCLUSIONS

RevenueFact must NOT include:

* TestId
* VisitId
* Bill breakdowns
* Cost
* Profit
* Status
* ExpectedAmount
* Pending flags
* Settlement logic

---

### 📤 FORMAT YOUR RESPONSE AS

1. **RevenueFact — Field Table**
2. **Enum Definitions**
3. **Invariants & Rules**
4. **Explicit Non-Goals**

Be precise. Be boring. Be strict.

---

### 🧠 MENTAL MODEL

Think of RevenueFact as:

> “A timestamped receipt stub dropped into a vault.”

Nothing more.

---

**End of prompt.**
