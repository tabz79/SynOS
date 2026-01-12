✦ Execution Plan: Final Hardening Patch — LeaveFactWriter.cs (NO DESIGN CHANGES)

You will apply a *surgical hardening patch* to the existing LeaveFactWriter.cs implementation.
This is NOT a redesign and NOT a refactor. The Leave Engine design is LOCKED.

Scope is STRICTLY LIMITED to the three items below. Do not touch anything else.

────────────────────────────────
🔴 REQUIRED (BLOCKING)
1. Transaction Boundary (MANDATORY)

• CreateLeaveFactAsync MUST execute all validations and the insert inside a single explicit database transaction.
• Use BeginTransactionAsync / CommitAsync.
• The transaction must wrap:
  - Finalized PayrollPeriod check
  - Overlap guard
  - LeaveFact insert + SaveChangesAsync
• No other methods should be affected.

────────────────────────────────
🟡 REQUIRED (NON-BLOCKING BUT MUST BE FIXED)
2. Finalized PayrollPeriod Overlap Semantics

• Replace the existing StartTime-only check.
• Correct rule:
  Reject creation if ANY overlap exists between:
  [LeaveFact.StartTime, LeaveFact.EndTime]
  and
  [PayrollPeriod.StartDate, PayrollPeriod.EndDate]
• This must still be enforced inside CreateLeaveFactAsync.

────────────────────────────────
🟡 OPTIONAL OPTIMIZATION (DO NOT CHANGE BEHAVIOR)
3. Cancelled LeaveFact Filtering Scope

• You MAY limit cancelled LeaveFact ID collection to the same EmployeeId.
• This is OPTIONAL and must not alter logic.
• If unsure, leave the current logic untouched.

────────────────────────────────
🚫 ABSOLUTE RULES (CRITICAL)

• DO NOT change entity definitions
• DO NOT touch enums
• DO NOT modify ILeaveFactWriter interface
• DO NOT add new services
• DO NOT alter cancellation semantics
• DO NOT refactor unrelated logic
• DO NOT add payroll calculations or balances
• DO NOT reformat code unnecessarily

────────────────────────────────

If anything is unclear, STOP and ask before proceeding.
