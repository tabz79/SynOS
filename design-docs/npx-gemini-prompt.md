✦ EXECUTION TASK: Referral Module Cleanup (Liability-Only)

You are working under a LOCKED SynOS architecture.

────────────────────────
CONTEXT (NON-NEGOTIABLE)
────────────────────────

• SpendFact = payment truth (Module 6)
• StatutoryObligationFact = legal obligation truth (Module 7)
• ReferralFinancialService MUST NOT create SpendFacts
• Referral payouts represent OWED AMOUNTS, not PAID AMOUNTS

────────────────────────
OBJECTIVE
────────────────────────

Fix build errors by correcting ownership in the Referral module.

Specifically:
• Remove ALL SpendFact creation or usage
• Remove ALL references to SpendLineItemFacts
• Replace them with a ReferralPayable / ReferralLiability fact

────────────────────────
SCOPE (STRICT)
────────────────────────

You MAY:
• Modify src/SynOS.Services/Referral/**
• Create ReferralPayableFact (or equivalent) under Referral domain
• Add DbSet for ReferralPayableFact
• Update ReferralFinancialService to write ONLY liabilities

You MUST NOT:
• Modify Module 6 (Spend / Payments)
• Modify Module 7 (Compliance)
• Modify Payroll, Time, or Leave modules
• Reintroduce SpendFacts into Referral
• Run payments, batches, or bank logic

────────────────────────
RULES
────────────────────────

• ReferralPayableFact is append-only
• No balances, no settlement status
• Do NOT infer or execute payments
• If ANY build error occurs outside Referral → STOP AND REPORT

────────────────────────
OUTPUT REQUIRED
────────────────────────

Return ONLY:
• Code changes performed
• Files modified / created

NO explanations.
NO redesign.
NO cleanup outside scope.
