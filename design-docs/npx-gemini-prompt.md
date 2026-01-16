Context:
SynOS now has a fully BUILT Operations Engine.
All execution truth and events originate there.

We are auditing the current Activity Stream implementation.
This is an AUDIT ONLY.

Do NOT propose implementation changes yet.

---

TASK:
Audit the existing Activity Stream end-to-end.

Answer the following precisely:

1. Source:
   - Where are activity entries generated today?
   - Which services/controllers emit them?
   - Is frontend involved?

2. Storage:
   - Is there a dedicated activity table?
   - Who writes to it?
   - Is it transactional with execution state?

3. Semantics:
   - For each activity type, state:
     “Is this an execution fact or an inferred/UI fact?”

4. Branch & Auth:
   - How is BranchId enforced?
   - Any overrides or loose filters?

5. Time & Ordering:
   - Timestamp source?
   - Deterministic ordering guaranteed?

6. Violations:
   - List ALL places where activity truth bypasses Operations Engine.

---

OUTPUT FORMAT:
- Bullet points per section
- Severity for each violation (LOW / MEDIUM / HIGH)
- Final summary:
  “Current Activity Stream is SAFE / PARTIALLY SAFE / UNSAFE”
