# 🔍 PHASE 2.5 — AUDIT REPORT

## 1️⃣ DiscountMaster Canonical Status
### A. Findings
*   `DiscountMaster` entity now contains `Code` (string), `Value` (decimal), `EffectiveFrom`, and `EffectiveTo`.
*   These fields were added via `schema_migration_v3.sql`.
*   The entity definition implies `Code` is the lookup key.

### B. Risk Assessment
*   **Low**. The schema structure supports the business requirement of backend-defined discounts.

### C. Verdict
*   **SAFE** (functionally) / **REQUIRES CANONICAL LOCK** (formally).

### D. Recommendation
*   Formalize this schema as the single source of truth for pricing adjustments.

---

## 2️⃣ DiscountCode Uniqueness & Safety
### A. Findings
*   `schema_migration_v3.sql` added the `Code` column **without a UNIQUE constraint or index**.
*   The database currently permits multiple rows with the exact same `Code`.
*   `VisitService.CreateVisitAsync` uses `FirstOrDefaultAsync(d => d.Code == ...)` to resolve the discount.
*   **Resolution Logic**: No `OrderBy` clause is used.

### B. Risk Assessment
*   **High**. If an admin creates two discounts with the same code (e.g., "PROMO" at 10% and "PROMO" at 50%), the system's behavior is **non-deterministic**. It relies on SQL default sorting, which is undefined. This is a financial integrity vulnerability.

### C. Verdict
*   **UNSAFE**

### D. Recommendation
*   **Immediate Fix Required**: Apply a database migration to add a `UNIQUE INDEX` on `DiscountMasters(Code)`. This will physically prevent duplicates and enforce canonical identity.

---

## 3️⃣ Event Semantics Adequacy
### A. Findings
*   Event Type: `DISCOUNT_APPLIED` (Added to Enum).
*   Event Payload (Text): `$"Discount {Code} applied: {Amount:F2}"`.
*   Event Metadata: Links to `DiscountFactId`.
*   The event stream does not explicitly carry `GrossAmount` or `NetAmount` in the payload fields, but the linked `DiscountFact` contains full financial context (`Gross`, `Discount`, `Net`).

### B. Risk Assessment
*   **Low**. While the event text is minimal, the immutable link to `DiscountFact` ensures auditability. Real-time dashboards can display the amount, and deep-dive audits can query the Fact.

### C. Verdict
*   **SAFE**

### D. Recommendation
*   No changes required for the event structure.

---

## 🏁 FINAL AUDIT SUMMARY
*   **Canonical Status**: ✅ PASS
*   **Uniqueness Safety**: ❌ **FAIL** (Critical Fix Needed)
*   **Event Semantics**: ✅ PASS

**Next Action**: Halt feature development. Execute **Phase 2.5 Remediation** to apply the Unique Index on `DiscountMasters`.