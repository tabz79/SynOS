IMPLEMENTATION 16.6 I-4 — Wire ONE Cost Attribution Flow

IMPORTANT CONTEXT (DO NOT IGNORE):
- Program.cs was intentionally cleaned.
- Cost Attribution services are NOT registered globally in DI.
- This is deliberate. Do NOT re-add global DI registrations.

Task:
Wire a single, explicit end-to-end Cost Attribution flow for ONE operational event.

Chosen Event:
- TestExecutionCompletedForCosting

Scope:
- WRITE REAL CODE
- Wire ONLY this single event
- Use existing:
  - CostingTriggerEvent
  - ICostAttributionPolicyResolver
  - ICostAttributionUsageFactWriter
- Do NOT generalize
- Do NOT add additional events
- Do NOT add background workers
- Do NOT add global DI registrations in Program.cs

Wiring Rules:
- The wiring should occur in the SAME service that already handles
  test execution completion (or the closest existing place).
- Services may be resolved locally (scoped) where needed.
- Flow must be explicit and readable.

End-to-End Flow:
1. Test execution completes
2. Emit TestExecutionCompletedForCosting event (in-process, not a bus)
3. Resolve applicable UsagePolicyVersion
4. Write exactly ONE UsageFact per policy
5. Stop

Hard Constraints:
- Do NOT read inventory stock
- Do NOT calculate costs
- Do NOT modify existing UsageFacts
- Do NOT touch analytics
- Do NOT touch Spend or Revenue engines

Deliver:
- Exact code changes (files + snippets)
- Short explanation of the wiring flow
- Confirmation that Program.cs remains unchanged

STOP after this single flow is wired.
