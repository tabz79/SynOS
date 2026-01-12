You are performing a STRICT ARCHITECTURAL AUDIT.

Context:
System: SynOS (Healthcare Workforce Operating System)
Focus: Payroll Proration Execution

The following are SEALED and NON-NEGOTIABLE:
- Modules 1–5 (HR, Time, Leave, Payroll truth engines)
- Time Engine (Module 3) MUST NOT be modified
- Leave Engine (Module 4) MUST NOT be modified
- Payroll proration design and execution skeleton are FINAL

You have already produced code changes.
Your task now is NOT to fix or extend anything.

────────────────────────
AUDIT OBJECTIVE
────────────────────────

Audit ALL changes you made and answer:

1. Whether each change is:
   a) REQUIRED by the proration execution design
   b) OPTIONAL but harmless
   c) ARCHITECTURAL VIOLATION

2. Whether any change:
   - Breaks module isolation
   - Modifies sealed truth engines
   - Introduces hidden coupling
   - Expands scope beyond proration execution

You must be brutally honest.
Do NOT justify based on convenience or build success.

────────────────────────
DESIGN BASELINE (YOU MUST AUDIT AGAINST THIS)
────────────────────────

Payroll proration execution design states:

- Only ProrationCalculator and PayrollRunOrchestrator may be touched
- Calculator is pure math
- Orchestrator wires calculator, asserts, and persists facts
- NO schema changes unless explicitly planned
- NO DbContext changes unless scoped to Payroll facts
- NO edits to TimeFactWriter, LeaveFactWriter, or sealed modules
- If build fails due to sealed modules → STOP and REPORT

────────────────────────
AUDIT SCOPE
────────────────────────

Audit the following actions you took:
- Creation of Payroll proration fact entities
- Modifications to SynOSDbContext
- EF migrations
- Any edits to Time Engine files
- Any edits to Leave Engine files
- Any code unrelated to Payroll proration orchestration

────────────────────────
REQUIRED OUTPUT FORMAT (STRICT)
────────────────────────

Return the audit in this exact structure:

1. CHANGE INVENTORY
   - List every file you modified or created

2. COMPLIANCE CLASSIFICATION
   For each change:
   - REQUIRED / OPTIONAL / VIOLATION
   - One-line reason

3. VIOLATION SUMMARY (IF ANY)
   - List concrete design rules violated
   - Severity: LOW / MEDIUM / HIGH

4. ROLLBACK RECOMMENDATION
   - NONE / PARTIAL / FULL
   - Exact files that must be reverted if rollback is needed

5. FINAL VERDICT
   - “Implementation conforms to design”
   OR
   - “Implementation violates design and must be corrected”

DO NOT propose fixes.
DO NOT write new code.
DO NOT defend decisions emotionally.

This audit will decide whether code stays or is reverted.
