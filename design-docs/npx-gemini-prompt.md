✦ DESIGN TASK: Module 8 — Admin, Policy & Governance

You are designing MODULE 8 of SynOS.

This module is GOVERNANCE-ONLY.
It owns permissions, roles, and approvals.
It NEVER writes business or financial truth.

────────────────────────
LOCKED CONTEXT
────────────────────────

• Modules 1–7 are COMPLETE and SEALED
• Truth engines:
  - HR Master
  - Time
  - Leave
  - Payroll
  - Spend
  - Statutory
• Module 8 must not contaminate any truth engine

────────────────────────
PURPOSE
────────────────────────

Module 8 answers:
“Who is allowed to do what — and who approves whom?”

────────────────────────
MODULE 8 OWNS
────────────────────────

• Role definitions (HR, Payroll, Finance, Admin)
• Capability definitions (RunPayroll, ApprovePayroll, InitiatePayment, ViewCompensation)
• Approval matrices (who approves which action)
• Separation-of-duties rules (e.g. creator ≠ approver)

────────────────────────
MODULE 8 MUST NEVER
────────────────────────

• Calculate payroll
• Approve money movement
• Write SpendFacts, PayrollFacts, or StatutoryFacts
• Store balances or outcomes
• Act as a workflow engine

────────────────────────
REQUIRED OUTPUT (STRICT)
────────────────────────

Return ONLY:

1. Purpose of Module 8
2. Core concepts (Role, Capability, ApprovalRule, Assignment)
3. Approval & separation-of-duties model (conceptual)
4. Data it reads (if any)
5. Hard prohibitions

NO code.
NO implementation.
FINAL DESIGN ONLY.
