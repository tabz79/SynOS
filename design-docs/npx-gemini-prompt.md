## ✅ Gemini Prompt — Step 5: Flow B Trigger Logic (FINAL, SAFE VERSION)

> **MODE:** IMPLEMENTATION MODE
> **SCOPE:** Flow B trigger logic ONLY
> **RESTRICTIONS:**
>
> * DO NOT perform any git operations
> * DO NOT modify migrations
> * DO NOT modify SynOSDbContext.cs
> * DO NOT modify entity definitions
> * DO NOT introduce new services
> * DO NOT introduce try/catch that hides failures
> * DO NOT touch Flow A logic
>
> ---
>
> **CONTEXT (LOCKED):**
>
> * Flow A (LabCollects) is complete and stable
> * Flow B schema (`ReceivableFact`) already exists and is migrated
> * DbContext wiring for ReceivableFact is already done
> * Build is passing
>
> ---
>
> **TASK:**
> Implement **Flow B (PartnerCollects) receivable creation logic**.
>
> ---
>
> **WHERE TO IMPLEMENT (STRICT):**
>
> * File: `src/SynOS.Services/ReportService.cs`
> * Method: `SignReportAsync(...)`
> * Insert logic **immediately after** the report status is persisted as `"Signed"`
>
> ---
>
> **BUSINESS RULES (DO NOT VIOLATE):**
>
> 1. A `ReceivableFact` is created **only once per Visit**
> 2. It is created **only when ALL reports for that visit are Signed**
> 3. It is created **only if**:
>
>    * `Visit.PaymentCollectionModel == "PartnerCollects"`
>    * `Visit.ReferralPartnerId` exists and partner is active
> 4. Amount must equal the **final Invoice Total**
> 5. Currency must come from **Invoice**
> 6. `OccurredAt` = report’s signed timestamp
> 7. Database uniqueness (one receivable per visit) is the idempotency guard
> 8. No reconciliation, no revenue recognition, no settlement logic here
>
> ---
>
> **EXPLICITLY FORBIDDEN:**
>
> * No `PayableFact`
> * No `SpendFact`
> * No `RevenueFact`
> * No changes to Flow A
>
> ---
>
> **OUTPUT FORMAT REQUIRED:**
>
> 1. Show ONLY the modified portion of `SignReportAsync`
> 2. Include any required `using` statements
> 3. No explanations unless necessary for correctness
>
> ---
>
> **GOAL:**
> Clean, minimal, deterministic Flow B trigger logic that compiles and respects the ledger design.

---
