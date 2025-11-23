You are a .NET 8 + SQL Server backend expert working on **SynOS** (Diagnostic Lab OS).

TASK (Day 9 / Milestone 2.5 – Reception Complete, BACKEND ONLY):
Build a **reception orchestration layer** that lets Reception perform the full flow via 3 high-level APIs:

1) POST  /api/v1/reception/start-visit  
2) POST  /api/v1/reception/complete-payment  
3) GET   /api/v1/reception/visit-summary/{visitId}

read the files 
@design-docs/design_master-SYNOS.md @design-docs/updated-docs/design-COMPLETE-INTEGRATED-BUILD-PLAYBOOK.md @design-docs/updated-docs/database-COMPLETE-with-milestones.md @design-docs/updated-docs/api-COMPLETE-with-milestones.md


IMPORTANT:
- **BACKEND ONLY**: Do NOT generate any React/Frontend/UI code.
- **NO NEW TABLES**: Milestone 2.5 is integration-only. Re-use existing tables & services from Milestones 1.3–2.4:
  - Patients, Appointments, Visits, TokenCounter, Orders, Invoices, Payments, PartialPayments, VisitCancellation, Samples (for collection), Barcodes/Print jobs.
- **REUSE EXISTING APIs** where possible (e.g. visit creation, token printing). We are adding a thin orchestration layer for Reception convenience, not reinventing lower-level endpoints.

----------------------------------------------------------------------
CONTEXT (WHAT ALREADY EXISTS – DO NOT BREAK)
----------------------------------------------------------------------

Database (already built in earlier milestones):
- Patients
- Appointments
- VisitDayGroup
- Visits
- TokenCounter
- Orders
- Invoices
- Payments
- PartialPayments
- VisitCancellation
- Samples + barcode-related tables (for sample collection)
- AuditLog (immutable)
- Users, Roles

Key existing workflows (already implemented earlier):

1) PATIENTS (Milestone 1.3)
- Patient search, create, dedup, merge.
- Phone history, MRN format: A00001, A00002, etc.

2) APPOINTMENTS (Milestone 1.4)
- Appointment booking / reschedule / cancel.
- Same-day visit detection + VisitDayGroup for combined billing warning.

3) VISITS + TOKENS + INVOICES + PAYMENTS (Milestone 2.1)
- Visits:
  (VisitId, PatientId, Token, TokenDate, Dept, Status, CreatedAt, RowVersion)
- TokenCounter:
  (CounterId, Dept, Day, LastNumber, MaxPerDay=999, UpdatedAt)
- Orders:
  (OrderId, VisitId, TestCode, Dept, Status, Price, Discount, CreatedAt)
- Invoices:
  (InvoiceId, VisitId, GrossAmount, DiscountAmount, NetAmount, TaxAmount, Total, Status, DueDate, CreatedAt)
- Payments:
  (PaymentId, InvoiceId, Amount, Method, ReceiptNo, ReceivedAt, ReceivedBy)
- PartialPayments:
  (PartialId, InvoiceId, Amount, Method, PaidAt)
- VisitCancellation:
  (CancelId, VisitId, Reason, Notes, CancelledBy, CancelledAt)

VisitService (already exists conceptually, reuse/extend instead of duplicating):
- CreateVisit(patientId, testCodes[], referrerId, dept)
  → GenerateDailyToken(dept)
  → Insert Visit
  → Insert Orders
  → Generate Invoice
- GenerateDailyToken(dept)
  → TokenCounter per dept+day, max 999, formats like "P-001" / "X-002"
- RecordPayment(invoiceId, amount, method, receiptNo)
  → Insert Payment
  → Update Invoice paid/pending & Status (Draft/Partial/Paid/Overdue)
- CancelVisit(visitId, reason)
  → Mark visit CANCELLED
  → Create VisitCancellation
  → Create CreditNote / refund (if payments exist)
- GetVisitDetails(visitId)
  → Return visit + orders + invoice + payments

VisitController (already exists):
- POST /api/v1/visits
- GET  /api/v1/visits/{id}
- GET  /api/v1/visits?dept=...&status=...&limit=50
- POST /api/v1/visits/{id}/payment
- POST /api/v1/visits/{id}/cancel
- GET  /api/v1/visits/{id}/token (for token printing, ESC/POS payload)

4) CONCURRENCY / EDIT LOCKS (Milestone 2.2)
- EditLocks table + service to avoid collisions.

5) SAMPLES + BARCODES (Milestone 2.3)
- Sample Collection Desk sees **paid** tokens only.
- Barcodes link Sample ↔ Visit/Order.
- Sample collection/rejection logic is already designed.

6) PRINTING (Milestone 2.4)
- Token printing (thermal, ESC/POS) via existing GET /api/v1/visits/{id}/token.
- Barcode printing (ZPL) for samples via existing API.

Global rule from system spec:
- Reception → Payment → Token → Dept Worklist → Doctor Sign → Delivery.
- Sample Collection Desk & Radiology Tech should only see **paid** visits/tokens (Invoice.Status == Paid/FullPaid).
- Reception NEVER prints barcodes (only tokens + invoice).

Your job in Day 9 is to **stitch these pieces together** for Reception via three simple orchestration endpoints.

----------------------------------------------------------------------
NEW BACKEND COMPONENT: RECEPTION FLOW ORCHESTRATOR
----------------------------------------------------------------------

Create a dedicated **ReceptionFlowService** in SynOS.Services that coordinates:
- patients
- visits
- orders
- invoices
- payments
- tokens

Design with clear methods:

1) StartVisitAsync(...)
2) CompletePaymentAsync(...)
3) GetVisitSummaryAsync(...)

Use dependency injection to pull in existing services / DbContext:
- SynOSDbContext
- VisitService (or equivalent existing class)
- AppointmentService (optional, to link appointments)
- TestMaster / Pricing service (if available)
- Audit logging
- Any existing sample/printing services as needed for blocking rules.

----------------------------------------------------------------------
1) ENDPOINT: POST /api/v1/reception/start-visit
----------------------------------------------------------------------

Purpose:
A single call for Reception that:
- Creates a Visit
- Generates Token (daily counter)
- Creates Orders for selected tests
- Creates Invoice (gross, discount, tax, net, total)
- Optionally links to an existing Appointment
- Returns consolidated summary for Reception’s “Step 2 → Step 3” screen.

Controller:
- Add a new **ReceptionController** under /api/v1/reception.
- Decorate with [Authorize(Roles = "Reception,Admin")] (or equivalent role policy).

Request DTO (ReceptionStartVisitRequest):
- patientId: UUID (required)
- dept: string (required, e.g. "Pathology" or "Radiology")  
  NOTE: For now assume **single department per visit**.
- testCodes: string[] (required, non-empty)
- referrerId: UUID (optional)
- appointmentId: UUID (optional) – if visit is from a scheduled appointment
- discountAmount: decimal (optional, default 0)
- discountPercent: decimal? (optional, used to compute discountAmount)
- taxPercent: decimal (optional, default from config if not supplied)
- notes: string (optional)
- combinedBillingGroupId: UUID (optional) – if part of same VisitDayGroup

Behavior (ReceptionFlowService.StartVisitAsync):

- Validate:
  - patient exists and is active.
  - all testCodes are valid and mapped to the given dept.
- If appointmentId is provided:
  - Validate the appointment belongs to patient & dept and is not cancelled.
  - Optionally mark appointment as “CheckedIn”.
- Call existing VisitService.CreateVisit(...) instead of rewriting that logic:
  - This should:
    - GenerateDailyToken(dept) using TokenCounter.
    - Create Visit.
    - Create Orders for each testCode with correct price and discount.
    - Create Invoice with Gross, Discount, Net, Tax, Total, Status=Draft (or Registered).
- Apply discount rules:
  - If discountPercent > 0, compute DiscountAmount accordingly.
  - Recalculate NetAmount/Total and set Invoice.Status.
- Apply tax rules using taxPercent, if not already baked into VisitService.
- If combinedBillingGroupId is supplied:
  - Link Visit to that VisitDayGroup (if this is the primary or secondary visit).
- Persist everything in a single transaction (EF Core transaction):
  - If any part fails, rollback.

Response DTO (ReceptionStartVisitResponse):
- data:
  - visitId
  - token (e.g. "P-013")
  - tokenDate
  - dept
  - status (visit status, e.g. "Registered" or "Unpaid")
  - patientSummary:
    - patientId
    - mrn
    - name
    - sex
    - age (or DOB)
  - orders: array of
    - orderId
    - testCode
    - testName (if easily resolvable from TestMaster)
    - dept
    - price
    - discount
  - invoice:
    - invoiceId
    - grossAmount
    - discountAmount
    - netAmount
    - taxAmount
    - total
    - status (Draft/Unpaid)
  - flags:
    - hasSameDayVisits (bool)
    - sameDayVisitCount
    - sameDayVisitIds[] (optional)

Implementation details:
- For same-day info:
  - Optionally call AppointmentService/VisitDayGroup logic to populate hasSameDayVisits & sameDayVisitCount.
- Log an AuditLog entry like:
  - Action = "ReceptionStartVisit"
  - Entity = "Visit"
  - EntityId = VisitId
  - UserId = currentUserId

HTTP Status:
- 201 Created on success.
- 400 for validation errors (invalid tests, patient not found, etc.).
- 409 if token limit (999/day) reached.

----------------------------------------------------------------------
2) ENDPOINT: POST /api/v1/reception/complete-payment
----------------------------------------------------------------------

Purpose:
One call that:
- Records payment against the visit’s invoice.
- Updates the Invoice.Status correctly (Draft → Partial → Paid).
- Updates Visit.Status to "Paid" when invoice is fully paid.
- Enforces the **blocking rule**: downstream workflows only see Paid visits.
- Returns a concise “Payment summary” for Reception's Step 3 → Step 4.

Controller:
- Same ReceptionController.

Request DTO (ReceptionCompletePaymentRequest):
- visitId: UUID (required)
- amount: decimal (required, > 0)
- method: string (required, e.g. "Cash", "Card", "UPI", "Bank", "Prepaid")
- receiptNo: string (optional but recommended)
- notes: string (optional)

Behavior (ReceptionFlowService.CompletePaymentAsync):

- Load visit + invoice for the given visitId.
  - If not found → 404.
  - If invoice.Status == "Paid" or "FullPaid":
    - Optionally allow additional payment only if there is a pending amount.
- Call existing VisitService.RecordPayment(invoiceId, amount, method, receiptNo):
  - Insert Payment.
  - Update Invoice paid/pending and Status (Draft/Partial/Paid/Overdue).
- If invoice becomes fully paid (pending == 0):
  - Set Invoice.Status = "Paid" or "FullPaid" (keep consistent named status).
  - Set Visit.Status to "Paid".
- Save changes within a transaction.
- Enforce **blocking rule**:
  - Sample Collection Desk & Radiology should only list visits where Invoice.Status is Paid/FullPaid.
  - As part of this milestone, verify/adjust existing sample/radiology worklist queries to filter on Invoice.Status.
  - Optionally, modify their services to:
    - Throw 409 if someone tries to collect sample or perform scan for an unpaid visit.
- Log AuditLog:
  - Action = "ReceptionCompletePayment"
  - Entity = "Invoice"
  - EntityId = InvoiceId
  - Include amount/method in metadata.

Response DTO (ReceptionCompletePaymentResponse):
- data:
  - visitId
  - invoiceId
  - invoiceStatus (after payment: Draft/Partial/Paid)
  - paidAmount (total paid so far)
  - pendingAmount
  - lastPayment:
    - paymentId
    - amount
    - method
    - receiptNo
    - receivedAt
  - visitStatus (Unpaid/Paid/Cancelled)

HTTP Status:
- 200 OK on success.
- 400 for invalid amount or missing invoice.
- 404 if visit not found.
- 409 for conflicts (e.g. overpayment beyond allowed rules, already fully paid).

----------------------------------------------------------------------
3) ENDPOINT: GET /api/v1/reception/visit-summary/{visitId}
----------------------------------------------------------------------

Purpose:
Reception-friendly consolidated view of everything related to a Visit for summary/print screens:
- patient
- visit
- token
- orders
- invoice
- payments
- readiness for Sample Collection / Radiology.

Controller:
- ReceptionController.

Behavior (ReceptionFlowService.GetVisitSummaryAsync):

- Load visit by visitId including:
  - Patient (MRN, name, DOB, sex)
  - Orders (tests, depts, prices, discounts)
  - Invoice
  - Payments
- Do NOT reintroduce barcodes here (Reception does not deal with barcodes).
- Determine readiness flags:
  - canCollectSamples = (visit.dept == "Pathology" && invoice.Status == "Paid" or "FullPaid")
  - canPerformScan  = (visit.dept == "Radiology" && invoice.Status == "Paid" or "FullPaid")
  - canPrintToken   = visit not cancelled.
- This endpoint should NOT generate print payload; token printing is via existing GET /api/v1/visits/{id}/token.

Response DTO (ReceptionVisitSummaryResponse):
- data:
  - visitId
  - token
  - tokenDate
  - dept
  - visitStatus
  - patient:
    - patientId
    - mrn
    - name
    - sex
    - dob
    - age (calculated)
    - phone
  - orders:
    - orderId
    - testCode
    - testName
    - dept
    - price
    - discount
  - invoice:
    - invoiceId
    - grossAmount
    - discountAmount
    - netAmount
    - taxAmount
    - total
    - paid
    - pending
    - status
  - payments: list of:
    - paymentId
    - amount
    - method
    - receiptNo
    - receivedAt
  - flags:
    - canPrintToken
    - canCollectSamples
    - canPerformScan

HTTP Status:
- 200 OK on success.
- 404 if visit not found.

----------------------------------------------------------------------
BLOCKING RULE – ENFORCEMENT
----------------------------------------------------------------------

Reception rule from spec:
- **No sample collection or radiology work** should begin until payment is complete.

As part of this milestone, ensure:

1) Sample Collection Desk worklist API (from Milestone 2.3):
   - Only returns visits where Invoice.Status is Paid/FullPaid.
   - If such a filter is not yet present, add a join to Invoice and enforce it.

2) Radiology Tech worklist API:
   - Same as above: filter by Paid/FullPaid.

3) Sample collection / scan completion APIs:
   - If someone tries to collect sample or mark scan complete for an unpaid visit:
     - Return 409 CONFLICT (or 400) with a clear error code/message:
       - e.g. code: "UNPAID_VISIT"; message: "Payment required before collection/scanning."

No new tables needed, only query filters and guards in existing services/controllers.

----------------------------------------------------------------------
DATA ACCESS & ARCHITECTURE RULES
----------------------------------------------------------------------

- Use existing SynOSDbContext and EF Core mappings.
- Favor calling existing VisitService/AppointmentService methods instead of duplicating their logic.
- Use async/await and cancellation tokens where appropriate.
- Wrap multi-step operations in transactions to keep Visit + Orders + Invoice + Payments consistent.
- Respect existing error handling and response envelope:
  - Typical pattern: { "data": {...}, "error": null } or similar.
- Respect existing API versioning: `/api/v1/...`.

----------------------------------------------------------------------
TEST DATA & SCENARIOS (BACKEND-ONLY)
----------------------------------------------------------------------

Create seed / test data (using migrations or a test seeding method) to validate:

1) Happy path – Pathology:
   - Patient: "Ramesh Sharma" (MRN A00001).
   - Call POST /api/v1/reception/start-visit with:
     - dept = "Pathology"
     - testCodes = ["CBC", "FBS"]
   - Expect:
     - 201 Created.
     - Token like "P-001".
     - Invoice with Gross = sum of test prices, correct Tax, Draft/Unpaid status.

   - Call POST /api/v1/reception/complete-payment for full `total`.
   - Expect:
     - Invoice.Status = Paid/FullPaid.
     - Visit.Status = Paid.
     - Payment record inserted.

   - Call GET /api/v1/reception/visit-summary/{visitId}.
   - Expect:
     - canPrintToken = true.
     - canCollectSamples = true (Pathology + Paid).
     - Sample Collection worklist now shows this token.

2) Radiology visit:
   - Start visit with dept = "Radiology", tests = ["X-Ray Chest"].
   - Complete payment.
   - Verify radiology worklist shows this visit only after payment.
   - canPerformScan flag is true in visit summary.

3) Blocking check – unpaid visit:
   - Create visit with Draft/Unpaid invoice (start-visit only, no payment).
   - Ensure:
     - Sample Collection & Radiology worklists do NOT show this visit.
     - Attempt to call existing sample-collection/scan-complete endpoints:
       - Should return 409 UNPAID_VISIT (or similar error code).

4) Partial payment:
   - Create visit with total 1000.
   - Pay 400 (partial).
   - Expect Invoice.Status = Partial, pending=600, visit.Status still Unpaid.
   - Ensure unpaid visit does NOT appear in sample/radiology worklists.
   - After paying remaining 600:
     - Invoice.Status = Paid.
     - Visit.Status = Paid.
     - Worklists include it.

5) Token limit:
   - Simulate TokenCounter.LastNumber = 999 for today and dept="Pathology".
   - Start new visit should fail with 409 "Daily token limit reached".

----------------------------------------------------------------------
OUTPUT EXPECTATIONS
----------------------------------------------------------------------

Produce:

1) **ReceptionFlowService** class (and interface) in SynOS.Services:
   - StartVisitAsync(...)
   - CompletePaymentAsync(...)
   - GetVisitSummaryAsync(...)

2) **ReceptionController** in SynOS.Api/Controllers:
   - POST /api/v1/reception/start-visit
   - POST /api/v1/reception/complete-payment
   - GET  /api/v1/reception/visit-summary/{visitId}

3) Necessary DTOs:
   - ReceptionStartVisitRequest / ReceptionStartVisitResponse
   - ReceptionCompletePaymentRequest / ReceptionCompletePaymentResponse
   - ReceptionVisitSummaryResponse and nested types.

4) Updates (if needed) to:
   - VisitService (to expose clean methods for orchestration).
   - Sample Collection and Radiology worklist/query methods to enforce the Paid-only rule.

5) EF Core usage with proper transactions and error handling.

Again: **DO NOT** generate any React or frontend code. This milestone is BACKEND-INTEGRATION ONLY.

Immutable Guardrails (must follow)

DO NOT run any shell commands, builds, or git operations.

If a DB migration or dotnet ef step is needed, only tell the Product Owner to run it; you must not run it.

If a new package is needed, just mention the install command in the TLDR; don’t execute it.

Edit only the files required for this Day 8 printing feature. No drive-by refactors, no formatting churn.

Preserve existing structure and style in each file.

After changes, output only a TLDR terminal-style summary:

What the issue/goal was (1–2 sentences)

What you implemented (1–2 sentences)

Which files changed (names only)

No code diffs, no full file dumps.

Extra guardrail for this task:

Do NOT create or modify anything under web/ or any frontend/React/TSX files.

If you feel UI changes are needed, just mention them in the TLDR as “future UI work”, do not implement.
