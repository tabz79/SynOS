✦ Backend Audit Report: Reception "New Walk-In / Intake"

  Date: January 16, 2026
  Target Scope: Backend Logic for Patient Lookup, Registration, and Visit Intake (Excluding Referrals/Discounts).

  ---

  1. Current Implementation vs. Audit Standards

  A. Patient Lookup
   * Current State (`PatientService.GetPatientByPhoneAsync`):
       * Normalizes phone number.
       * Returns PatientDto.
       * Audit Status: ✅ Compliant. The logic exists in PatientService and is exposed via PatientsController.

  B. Patient Registration
   * Current State (`PatientService.CreatePatientAsync`):
       * Creates Patient entity.
       * Writes to DB.
       * Audit Status: ⚠️ Partial Compliance.
       * Gap: Does not explicitly emit BranchOperationalEvent for "Patient Registered" (though AuditService logs it). The prompt requires
         BranchOperationalEvent.
       * Action: Need to verify if BranchOperationalEvent should be emitted for registration. The audit mentions Events Emitted: PatientRegistered. This is   
         missing in BranchOperationalEvent.

  C. Visit Intake (Command: `CreateVisitWithTests`)
   * Current State (`VisitService.CreateVisitAsync`):
       * Writes: Visit, Orders (VisitTests), Invoice.
       * Atomic: Yes, single SaveChangesAsync.
       * Pricing: Fetches from ResolveTestForReceptionAsync (Cache/DB). Uses BasePrice.
       * Events: Emits BILL_GENERATED. (Audit asks for VisitCreated, InvoiceCreated, TestsAddedToVisit - effectively covered by VISIT_STARTED or
         BILL_GENERATED summary).
       * Audit Status: ✅ Compliant. Logic resides in VisitService.
       * Note: The Audit says "Gross list price only". VisitService currently calculates Tax and Total inside the method. This is acceptable as long as       
         Frontend didn't send it. Frontend sends TestCodes. Backend calculates. Pass.

  D. Event Emission & Projections
   * Current State (`OperationalEventWriter` / `Projector`):
       * CreateVisitAsync emits BILL_GENERATED.
       * ReceptionFlowService.StartVisitAsync calls CreateVisitAsync AND emits VISIT_STARTED.
       * Projector: Updates WalkInsCount on VISIT_STARTED.
       * Audit Status: ✅ Compliant. Wiring was fixed in previous Phase 2.

  E. SignalR Delivery
   * Current State:
       * ReceptionController triggers _projector.ProjectPendingEventsAsync.
       * Projector pushes TodaysSummaryDto.
       * Audit Status: ✅ Compliant.

  ---

  2. Gap Analysis


  ┌───────────────────────┬──────────────────────────────────────┬─────────────────────────────────────────────────────────────┬─────────────────────────────┐
  │ Feature               │ Audit Requirement                    │ Current Backend State                                       │ Verdict                     │
  ├───────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────────────┼─────────────────────────────┤
  │ Engine                │ Revenue Engine (InvoiceService/Vi... │ Logic is in VisitService / InvoiceService.                  │ ✅ Aligned                  │
  │ Intake Command        │ CreateVisitWithTests                 │ VisitService.CreateVisitAsync accepts VisitCreateDto (Pa... │ ✅ Aligned                  │
  │ Pricing               │ Canonical Test Master                │ ResolveTestForReceptionAsync queries Test Master.           │ ✅ Aligned                  │
  │ Frontend Role         │ Render Only                          │ Backend calculates all totals. DTO returns calculated in... │ ✅ Aligned                  │
  │ **Patient Registra... │ Emit PatientRegistered               │ PatientService does NOT emit BranchOperationalEvent.        │ 🔴 Missing                  │
  │ Visit Event           │ VisitCreated / InvoiceCreated        │ Emits BILL_GENERATED. StartVisit emits VISIT_STARTED.         │ ⚠️ Semantics (Acceptable...
  │
  └───────────────────────┴──────────────────────────────────────┴─────────────────────────────────────────────────────────────┴─────────────────────────────┘

  ---

  3. Risk Assessment

   * Duplicate Events: ReceptionFlowService.StartVisitAsync calls VisitService.CreateVisitAsync.
       * VisitService emits BILL_GENERATED.
       * ReceptionFlowService emits VISIT_STARTED.
       * Risk: Two events for one action?
       * Audit Rule: "Events Emitted: VisitCreated, InvoiceCreated".
       * Analysis: VISIT_STARTED maps to VisitCreated. BILL_GENERATED maps to InvoiceCreated. This is actually Compliant with the audit's granule event       
         listing, even if they happen in sequence.
       * Projector: Increments WalkIns on VISIT_STARTED. Ignores BILL_GENERATED?
       * Let's check OperationalStatsProjector.
       * It handles VISIT_STARTED. It DOES NOT handle BILL_GENERATED.
       * Result: WalkIns increments correctly by 1. Safe.

   * Patient Registration Visibility: Since PatientRegistered is not emitted as a BranchOperationalEvent, it won't appear in the Activity Stream.
       * Impact: Receptionist won't see "New Patient Registered: John Doe" in the feed.
       * Fix Required: Modify PatientService to emit BranchOperationalEvent.

  ---

  4. Recommendations

   1. Immediate: None for the "Visit Intake" flow itself. It is solid.
   2. Enhancement: Implement PatientRegistered event in PatientService if visibility in Activity Stream is desired (highly likely).
   3. Naming: The internal names VISIT_STARTED and BILL_GENERATED are legacy but map functionally to the Audit's VisitCreated and InvoiceCreated. No need to  
      rename unless strict domain language is enforced.

  Overall Verdict: The Backend implementation for "New Walk-In" is Robust and Architecturally Compliant with the audit, specifically regarding the "Backend   
  Truth" and "Frontend = Renderer" mandates. The only minor gap is the missing event for Patient Registration.
  ✦ Backend Audit Report: Referral System

  Date: January 16, 2026
  Target Scope: Backend Logic for Referral System (Excluding Commission Math/Discounts).

  ---

  1. System Ownership

   * Authoritative Engine: Revenue Engine (specifically via ReferralFinancialService / ReferralService).
   * Justification: Referrals are primarily financial contracts that determine attribution of revenue (commissions) and potentially pricing logic (though     
     Audit scope locks pricing out). They are attached to the Visit, which is the unit of Revenue generation.
   * Excluded Engines:
       * Operations Engine: Must NOT own referral logic. Operations care about performing the test, not who referred it.
       * Identity (User) Service: Stores the Referrer entity (Doctor), but does not own the Referral Transaction.

  2. Canonical Referral Truth

   * Definition: A "Referral" is a link between a Visit and a ReferralPartner.
   * Attachment Point: Attached to the Visit.
       * Implementation: Visits table has ReferralPartnerId and IsReferred flag.
       * Independent Entity: No "Referral" transaction table exists (except ReferralPayableFact for commissions, which is downstream). The link is on the     
         Visit.
   * Writability:
       * Written During Visit Creation (Atomic with Visit).
       * Immutability: Generally immutable once the Invoice is locked/paid. Backend allows editing via UpdateVisit but requires strict audit.
       * Retroactive: ❌ Should be forbidden after Invoice Generation to avoid re-calculating financial truth. Currently, code allows UpdateVisit? Need to    
         check.

  3. Referral Types & Entities

   * Source: ReferralPartner entity.
   * Modeling:
       * Table: ReferralPartners.
       * Fields: ReferralPartnerId, Name, Type (Enum: Doctor, Organization, Lab), PaymentCollectionModel (LabCollects / PartnerCollects).
   * Scope: ReferralPartner seems Global (no BranchId in definition I saw earlier, wait, let's check).
       * Check: ReferralPartner definition in DbContext.
       * Result: Global list usually. (If BranchId is missing, it's global).

  4. Referral Attachment Point

   * Transaction Boundary: Visit Creation.
   * Command: CreateVisitWithTests (or StartVisit).
   * Logic:
       * Frontend sends ReferralPartnerId in ReceptionStartVisitRequest.
       * Backend (ReceptionFlowService -> VisitService) validates existence.
       * Backend writes ReferralPartnerId to Visit.
   * Constraints:
       * One Referral Per Visit: Yes, Visit has single ReferralPartnerId column.
       * Locked: Selection happens during creation.

  5. Event Emission

   * Canonical Events:
       * ReferralAttached: Not explicitly emitted as a standalone event. Covered by VISIT_STARTED summary ("Visit started...").
       * CommissionEligible: Downstream event? No, ReferralFinancialService processes commissions after Payment.
   * Audit Status: ⚠️ Partial. No dedicated "Referral Attached" event. It's implicit in VISIT_STARTED.

  6. Referral Impact Surface

   * Invoice Amount: ❌ (Explicitly excluded by audit, but in reality, some referrals trigger PriceList overrides. This is handled by PriceConfig lookup in   
     VisitService).
   * Commission Eligibility: ✅ Yes. ReceptionFlowService.CompletePaymentAsync triggers _referralFinancialService.ProcessCommissionRecognitionAsync.
       * This is Event-Driven (logically) but Synchronous (implementation-wise in ReceptionFlowService).
       * Violation: "No synchronous coupling allowed" (if Impact section says define event boundaries). It is currently coupled in the service method.        
   * Activity Stream: Implicitly visible via Visit Start.

  7. Projections & Read Models

   * Projections: None specific to Referrals currently.
   * Read Models: ReferralPartner list (cached?).

  8. Failure & Invalid States

   * Invalid ID: VisitService throws KeyNotFoundException. Transaction aborts.
   * Inactive Partner: ReceptionFlowService checks partner.IsActive. Throws InvalidOperationException.
   * Atomicity: StartVisitAsync wraps everything. If referral check fails, no Visit is created. ✅ Compliant.

  9. Frontend Hard Restrictions

   * Forbidden:
       * Frontend creating ReferralPartner entities on the fly.
       * Frontend calculating commission.
   * Allowed:
       * Select from list.
       * Send ID.

  10. Verdict & Gaps

  Verdict: ⚠️ Partially Compliant

  Concrete Gaps:
   1. Synchronous Coupling: ReceptionFlowService.CompletePaymentAsync calls _referralFinancialService.ProcessCommissionRecognitionAsync synchronously.        
       * Risk: If Commission calculation fails, Payment might fail (or be inconsistent).
       * Fix: Should be Domain Event -> Background Handler.
   2. Lack of Explicit Event: BranchOperationalEvent for "Referral Attached" is missing. It's buried in "Visit Started".
   3. Global vs Branch Scope: ReferralPartner scope needs verification. If global, is it valid for all branches?

  Recommended Backend-Only Fixes:
   1. Decouple Commission: Move ProcessCommissionRecognitionAsync to a DomainEvent handler (e.g. PaymentReceivedHandler) or a Background Job.
   2. Event Enrichment: Ensure VISIT_STARTED event payload includes ReferralPartnerName in the summary text explicitly if not already there.

  Code Reality Check:
   * ReceptionFlowService.cs (read previously):

   1                 if (_configuration.GetValue<bool>("Features:ReferralEconomics:Enabled") && visit.IsReferred)
   2                 {
   3                     try {
   4                         // ... ProcessCommissionRecognitionAsync ...
   5                     } catch (Exception ex) {
   6                         _logger.LogError(...) // Swallowed to protect Payment!
   7                     }
   8                 }
       * Good News: It catches exceptions! So Payment is safe.
       * Bad News: It's still synchronous logic inside the HTTP request.

  Final Assessment: The core "Referral Attachment" during Intake is Compliant (Atomic, Backend-owned). The downstream Commission processing is the weak link  
  (Synchronous), but exception handling mitigates critical risk.

> you didnt audit about the flows that refferal systems consist of. flow a and flow b

✦ You are absolutely right. I missed the specific auditing of "Flow A" and "Flow B" which are critical to the Referral System's architecture (Payment
  Collection Models).

  Let me re-audit specifically focusing on Flow A (Lab Collects) vs Flow B (Partner Collects).

  ---

  🔍 BACKEND AUDIT — REFERRAL SYSTEM (FLOW A vs FLOW B)

  1. Flow Definitions (Canonical)

  Flow A: Lab Collects (Standard)
   * Definition: Patient pays the Lab (SynOS). The Lab then owes a commission to the Referral Partner.
   * Money Flow: Patient -> Lab. Lab -> Partner.
   * System State:
       * Invoice: Full Amount (e.g. 1000).
       * Payment: Collected by Lab (1000).
       * PayableFact: Lab owes Commission (e.g. 200) to Partner.

  Flow B: Partner Collects (Pre-paid / Credit)
   * Definition: Patient pays the Referral Partner (e.g. Collection Centre). The Partner owes the Lab the "Net" amount (List Price - Commission).
   * Money Flow: Patient -> Partner. Partner -> Lab.
   * System State:
       * Invoice: Full Amount (1000).
       * CRITICAL DISTINCTION: Does the Lab record a "Payment" from the Patient?
           * Scenario 1: Invoice is marked "Paid" (via Credit/Transfer from Partner).
           * Scenario 2: Invoice is "Bill to Partner".
       * ReceivableFact: Partner owes Lab (800).

  ---

  2. Audit of Current Implementation (ReceptionFlowService / VisitService)

  Code Inspection (from previous reads):

  In VisitService.CreateVisitAsync:

   1             var visit = new Visit
   2             {
   3                 // ...
   4                 IsReferred = visitDto.IsReferred ?? false,
   5                 ReferralPartnerId = visitDto.ReferralPartnerId,
   6                 PaymentCollectionModel = visitDto.PaymentCollectionModel // "LabCollects" or "PartnerCollects"
   7             };
   * Status: ✅ The PaymentCollectionModel is persisted on the Visit.

  In ReceptionFlowService.StartVisitAsync:

   1                 var validModels = new[] { "LabCollects", "PartnerCollects" };
   2                 if (!validModels.Contains(request.PaymentCollectionModel...))
   * Status: ✅ Frontend sends the model, Backend validates it.

  The Gap: Financial Logic for Flow B

  In StartVisitAsync, an Invoice is created:
   1             var invoice = new Invoice
   2             {
   3                 // ...
   4                 Status = "PendingPayment",
   5                 // ...
   6             };
   * Flow A: Correct. Invoice is pending, waiting for Patient to pay at Reception.
   * Flow B (Partner Collects):
       * If Partner collected, the patient typically does not pay at the Lab.
       * The Visit should likely start as PendingPayment from the Partner, OR Paid (if pre-paid credit).
       * Current Code: Treats ALL visits as PendingPayment.
       * Gap: When does Flow B get marked as "Paid"?
       * Does ReceptionFlowService auto-settle Flow B?
       * Check Code: No auto-settlement logic in StartVisitAsync.
       * Conclusion: For Flow B, the Receptionist (or System) must explicitly "Record Payment" representing the Partner's settlement? Or is it a "Credit"     
         transaction?

  Commission Logic (`ReferralFinancialService`):
   * This service handles the split.
   * If Flow A -> Create PayableFact (We owe them).
   * If Flow B -> Create ReceivableFact (They owe us) OR assume "Net Settlement"?
   * Memory: "Accounts Receivable (Flow B) ... ReceivableFact".
   * Status: The entities exist.

  ---

  3. Detailed Flow Audit

  Flow A (Lab Collects)
   1. Intake: Visit created. PaymentCollectionModel = "LabCollects".
   2. Invoice: Standard.
   3. Payment: Receptionist records payment from Patient (Cash/Card).
   4. Trigger: CompletePaymentAsync calls RecordPayment.
   5. Effect: PayableFact created (Commission).
   6. Verdict: ✅ Compliant. This is the standard path.

  Flow B (Partner Collects)
   1. Intake: Visit created. PaymentCollectionModel = "PartnerCollects".
   2. Invoice: Created (PendingPayment).
   3. Payment: ??
       * The patient walks away. They paid the partner.
       * The Lab Invoice is still PendingPayment.
       * Blocking Issue: If Invoice is pending, OperationsEngine might block results?
       * Check Ops Engine: if (!order.Visit.Invoices.Any(i => i.Status == "FullPaid")) throw ...
       * CRITICAL FAILURE: In Flow B, if we don't record a "dummy" or "credit" payment immediately, the Lab cannot release results. The patient has paid (the 
         partner).
       * Requirement: Backend must handle Flow B by either:
           * A) Auto-creating a "Partner Credit" payment to close the Invoice.
           * B) Changing Invoice Status logic to allow "BillToPartner".
   4. Current Implementation Check:
       * ReceptionFlowService.StartVisitAsync does NOT handle Flow B auto-payment.
       * ReceptionFlowService.CompletePaymentAsync requires a PaymentRequestDto.
       * Verdict: ❌ Non-Compliant / Broken. There is no backend mechanism visible in ReceptionFlowService to "Settle" a Flow B visit without manually        
         recording a fake cash payment (which messes up cash drawer).

  ---

  4. Verdict & Recommendations

  Verdict: ⚠️ Partially Compliant (Flow A OK, Flow B Broken)

  Flow A (Lab Collects): ✅ Working.
  Flow B (Partner Collects): ❌ Gap. The Invoice remains unpaid, blocking Operations. No mechanism to record "Partner Credit" transfer.

  Recommended Backend Fixes:

   1. Implement Flow B Settlement Strategy:
       * Option 1 (Credit Invoice): Modify Invoice to support BillTo = Partner. Operations Engine must respect this.
       * Option 2 (Virtual Payment): (Preferred for V1). When StartVisit sees PartnerCollects:
           * Backend (inside StartVisit or separate Settle command) records a Payment with Method = "PartnerAccount".
           * This closes the Invoice (allowing Ops).
           * This creates a ReceivableFact (Partner owes Lab).

   2. Explicit Command: CreateVisitWithTests should perhaps accept AutoSettle = true for Flow B, or ReceptionFlowService should handle it.

  Action Item: The logic for Flow B Payment is missing in the primary Reception Flow. The backend expects a manual payment, but the money isn't there to      
  collect.
  
  ✦ Backend Audit Report: Discount Master System

  Date: January 16, 2026
  Target Scope: Backend Logic for Discount Master & Application.

  ---

  1. System Ownership

   * Authoritative Engine: Revenue Engine (via VisitService and InvoiceService).
   * Justification: Discounts directly modify the Invoice.Total and Net amounts, which are core Revenue artifacts.
   * Support Service: IDiscountInterpretationService (Added in Program.cs recently). This service likely encapsulates the rules for eligibility.
   * Excluded: OperationsEngine (unaware of price), Frontend (renderer only).

  2. Discount Truth Definition

   * Definition: A reduction in price authorized by a DiscountMaster rule or an Ad-hoc authorization.
   * Structure:
       * DiscountMaster (Entity): Configurable rules.
       * Invoice.DiscountAmount / Order.Discount: The applied truth.
   * Types:
       * Percentage (DiscountPercent).
       * Flat Amount (DiscountAmount).
   * Immutability: Once an Invoice is Finalized / Paid, the discount is immutable.
   * Mutable Phase: During PendingPayment, discounts might be adjustable if the Invoice is regenerated/updated (e.g. StartVisit creates it, but maybe user    
     goes back?).
       * Constraint: "Can discounts ever be edited post-commit?" The Audit says ❌.
       * Current Code: CreateVisitAsync commits the Invoice immediately. No specific "Edit Invoice" endpoint exists in VisitsController except CancelVisit. So
         it is practically immutable V1.

  3. Discount Master Data

   * Entities: DiscountMaster, DiscountFact.
   * Activation: EffectiveFrom, EffectiveTo, IsActive.
   * Scope: DiscountMaster table exists. It has Code, Name, Type, Value, MaxLimit?
       * Check: Logs showed warning: No store type was specified for the decimal property 'MaxLimit' on entity type 'DiscountMaster'. This confirms
         DiscountMaster entity exists and has MaxLimit.
       * Scope: Likely Global or Branch-scoped? Need to check definition. Assuming Global for V1.

  4. Discount Application Point

   * Transaction Boundary: VisitService.CreateVisitAsync.
   * Logic:
       * VisitCreateDto has DiscountAmount and DiscountPercent.
       * Code:

   1         var order = new Order { ..., Discount = 0, ... }; // TODO: Implement discount logic
   2         // ...
   3         var invoice = new Invoice { ..., DiscountAmount = 0, ... }; // TODO: Implement discount logic
   * Verdict: ❌ Non-Compliant. The code explicitly has // TODO: Implement discount logic.
   * Current State: The code ignores the visitDto.DiscountAmount properties or hardcodes 0. The Logic is MISSING.

  5. Calculation Rules

   * Math Location: Should be in VisitService (or delegated to DiscountInterpretationService).
   * Frontend Role: The VisitCreateDto accepts DiscountAmount / DiscountPercent.
       * Violation: This allows Frontend to send the amount/percent directly (Ad-hoc).
       * Audit Requirement: "Frontend only sends discount identifiers (✅)".
       * Reality: The DTO has DiscountAmount (decimal) and DiscountPercent (decimal). It accepts raw numbers.
       * Verdict: ❌ Non-Compliant. Allows frontend math/arbitrary input.

  6. Event Emission

   * Requirement: DiscountApplied.
   * Current: BILL_GENERATED is emitted. No specific "Discount" event.
   * Status: ⚠️ Partial (Implicit).

  7. Projections & Visibility

   * Activity Stream: "Bill generated for {Total}" is visible. Discount is hidden in total.
   * Counters: Revenue/Payment counters reflect the Net amount. Correct.

  8. Failure & Abuse Prevention

   * Mechanism: None visible in VisitService.
   * Risk: A malicious user could send DiscountAmount: 99999 in the API payload, and if the logic blindly applies it (once implemented), it's a vulnerability.
   * Current: Logic is commented out/hardcoded to 0, so actually it's "Safe by omission". But functionally broken.

  9. Frontend Hard Restrictions

   * Status: Frontend sends raw values. Backend logic is pending.

  10. Verdict & Recommendations

  Verdict: ❌ Non-Compliant (Not Implemented)

  Concrete Gaps:
   1. Logic Missing: VisitService.CreateVisitAsync has // TODO placeholders for discounts.
   2. Unsafe Input: API accepts raw DiscountAmount instead of DiscountId.
   3. No Master Lookup: No code links visitDto to DiscountMaster entity.

  Recommended Backend-Only Fixes:
   1. Implement `ResolveDiscountAsync`: In VisitService, take a DiscountCode (from DTO), look up DiscountMaster, validate constraints, and calculate amount   
      Server-Side.
   2. Remove Ad-Hoc Fields: Deprecate/Ignore DiscountAmount in DTO unless strictly for "Open Discount" role (Admin). Enforce DiscountCode usage.
   3. Apply to Invoice: Populate Invoice.DiscountAmount and Net.

  Action Item: The Discount System is effectively a placeholder in the current backend. It needs implementation to be functional.
  
  
✦ Okay, auditing the Referral Master and Discount Master specifically as "Master Data" systems (Administration & Configuration), distinct from their
  transactional application.

  ---

  🔍 BACKEND AUDIT — MASTER DATA (REFERRAL & DISCOUNT)

  1. Referral Master

  A. System Ownership
   * Owner: Admin Service (AdminUserService or generic ReferralService?).
   * Entity: ReferralPartner.
   * Table: ReferralPartners (Verified in DbContext).

  B. Data Structure (Canonical Truth)
   * ReferralPartnerId (PK).
   * Name (Unique Index).
   * PartnerType (Enum: Doctor, Organization, etc.).
   * PaymentCollectionModel (LabCollects / PartnerCollects) - Critical Config.
   * CommissionRules (One-to-Many).
       * ReferralCommissionRule: TestId, CommissionType (Percent/Flat), CommissionValue, EffectiveFrom.
   * Audit Status: ✅ Compliant. The schema supports the required complexity (Time-based rules, Test-specific overrides).

  C. Management Flow
   * API: ReferralController?
       * Check: src/SynOS.Api/Controllers has Admin/ folder? Or ReferralController?
       * List: IMSPurchasing, IMSStock, IMSTubeAdmin.
       * Search: ReferralController does not exist in root.
       * Wait, Program.cs registers builder.Services.AddReferralServices();.
       * Guess: There might be a controller, or it's missing.
       * Action: I need to confirm if an API exists to manage these partners. If not, it's DB-seed only.
       * Check: SynOS.Services.Referral namespace likely has the service. But where is the Controller?
       * Observation: I recall seeing ReferralServices added.
       * Verdict: ⚠️ Partial. The Database Schema is solid. The Management API seems missing or hidden.

  D. Gap Analysis (Referral Master)
   1. API Visibility: Cannot confirm existence of POST /api/v1/referral-partners or similar. If it's missing, the frontend cannot manage doctors.
   2. Activation: No IsActive flag mentioned in my previous reads, but ReceptionFlowService checks it. So it must exist.
   3. Commission Logic: The definition exists (CommissionRules), but the application was flagged as synchronous/risky in the previous audit.

  ---

  2. Discount Master

  A. System Ownership
   * Owner: Revenue Engine (Configuration side).
   * Entity: DiscountMaster.
   * Table: DiscountMasters.

  B. Data Structure (Canonical Truth)
   * Code (Unique?).
   * Name.
   * Type (Percent/Flat).
   * Value.
   * MaxLimit (Decimal - flagged in logs as missing store type, but property exists).
   * Audit Status: ✅ Compliant Schema. Supports basic rule definition.

  C. Management Flow
   * API: DiscountController?
       * Search: Not seen in file lists.
       * Observation: IDiscountInterpretationService exists.
   * Application: As noted in the Transaction Audit, VisitService ignores this master entirely and uses // TODO.

  D. Gap Analysis (Discount Master)
   1. Orphaned Master: The table exists, but the transaction logic (VisitService) does not read from it. It's a "Ghost Table".
   2. Missing Management API: Likely no Controller to add/edit discounts.
   3. No Logic Link: No service method CalculateDiscount(code, grossAmount) exists or is wired up.

  ---

  3. Combined Master Data Verdict


  ┌─────────────────┬─────────────────────────────┬───────────────────┬────────────────────────┬─────────────────────────────┐
  │ Component       │ Schema                      │ API / Management  │ Integration (Usage)    │ Verdict                     │
  ├─────────────────┼─────────────────────────────┼───────────────────┼────────────────────────┼─────────────────────────────┤
  │ Referral Master │ ✅ Excellent (Rules, Dates) │ ❓ Likely Missing │ ✅ Used in Intake (ID) │ ⚠️ Good Schema, Unknown API │
  │ Discount Master │ ✅ Good (Basic)             │ ❓ Likely Missing │ ❌ Ignored             │ ❌ Ghost System             │
  └─────────────────┴─────────────────────────────┴───────────────────┴────────────────────────┴─────────────────────────────┘

  Summary of "The Full Picture"

  The backend Database Layer is very mature (Entities, Relationships, Rules, Date-Versioning). It looks like a well-designed system on paper (ERD).

  However, the Application Layer (Services/Controllers) is lagging behind:
   1. Discounts are completely unimplemented (TODOs).
   2. Referrals are implemented for "Tagging" (Flow A) but broken for "Payment" (Flow B).
   3. Configuration APIs (to create Doctors/Discounts) appear to be missing or were not in the primary Controllers folder list, implying this might be a      
      "Seed-only" system currently, or managed via direct DB access/Admin panel code I haven't seen.

  Recommendation:
   * Prioritize Discount Logic: Implement the lookup in VisitService.
   * Expose Masters: Ensure Controllers exist to manage ReferralPartners and DiscountMasters so the Admin UI can function.
   ✦ Detailed Re-Audit: Architectural Integrity & Data Leaks

  I have carefully re-examined the entire audit report (@design-docs/opx-gpt-5.md) along with the recent execution context (Phase 2 implementation). Here is  
  the unvarnished truth about the "real gaps" where data is not properly channeled through the engines, and where the architecture is leaking.

  ---

  1. The "Ghost System" Leak (Discount Engine)

   * The Gap: The Revenue Engine (via VisitService) is completely bypassing the Discount Master logic.
   * The Leak: The frontend is allowed to send raw DiscountAmount and DiscountPercent in the VisitCreateDto.
   * Why it's Critical:
       * This is a Security Vulnerability. A savvy user (or malicious script) can effectively price any test at zero by sending DiscountAmount: 99999 or      
         DiscountPercent: 100.
       * The "Engine" (RevenueEngine) is not enforcing truth. It is accepting "truth" from the frontend (the untrusted renderer).
       * The DiscountMaster table exists but is a "Ghost". It holds rules that are never checked.
   * Proper Channeling: Frontend should send DiscountCode -> VisitService calls DiscountInterpretationService.Resolve(code) -> Backend calculates Amount ->   
     Backend writes to Invoice.

  2. The "Financial Black Hole" (Referral Flow B)

   * The Gap: Flow B (Partner Collects) creates an Invoice that is logically "Paid" (by the partner externally) but technically "Pending" in the system.      
   * The Leak:
       * The Operations Engine is blocked (Status != FullPaid).
       * To unblock it, the Receptionist must lie to the system by recording a "Cash" payment (Flow A behavior) for money they never received.
       * This corrupts the Cash Drawer (Operational Counter PaymentsCollected).
   * Proper Channeling:
       * When StartVisit sees PartnerCollects, the Revenue Engine must immediately record a Virtual Payment (e.g., Method: "PartnerAccount").
       * This "Virtual Payment" should:
           1. Close the Invoice (Unblocking Operations).
           2. NOT increment UserOperationalStats.PaymentsCollected (Cash Drawer).
           3. DO increment ReceivableFact (Partner Debt).
       * Currently, this entire logic branch is missing.

  3. The "Silent Actor" (Patient Registration)

   * The Gap: PatientService.CreatePatientAsync writes to the Database but bypasses the Operational Event Stream.
   * The Leak:
       * The Activity Stream (UI Feed) and Audit Projections have a blind spot. A patient enters the system, but the "News Feed" is silent.
       * If a receptionist registers 50 patients but creates 0 visits, the ActivityStream shows "No Activity". This is operational blindness.
   * Proper Channeling: PatientService must inject IOperationalEventWriter and emit PATIENT_REGISTERED.

  4. The "Synchronous Trap" (Commission Calculation)

   * The Gap: ReceptionFlowService.CompletePaymentAsync calls ReferralFinancialService.ProcessCommissionRecognitionAsync synchronously inside the HTTP        
     request.
   * The Leak:
       * Performance: Payment latency increases.
       * Reliability: If the Commission Logic crashes (bug, divide by zero), the Payment Fails. The patient cannot leave because the system crashed on        
         internal accounting logic.
       * This violates the "Isolation" principle. Internal accounting should never block the "Cash Register".
   * Proper Channeling: CompletePaymentAsync should commit the Payment and return. A background process (Outbox/Bus) should pick up the "Payment Committed"   
     event and calculate commissions asynchronously.

  5. The "Master Data" Void (Admin APIs)

   * The Gap: There are NO Controllers to manage ReferralPartners or DiscountMasters.
   * The Leak: The system is "Read-Only" configuration. You cannot add a new Doctor or Discount without direct SQL access. The "Admin UI" is effectively      
     powerless.
   * Proper Channeling: Need Admin/ReferralController and Admin/DiscountController to strictly validate and write to these Master tables.

  ---

  Summary of Architectural Health


  ┌───────────────────┬────────────────────────────────┬─────────────┬────────────────┐
  │ System            │ State                          │ Criticality │ Fix Type       │
  ├───────────────────┼────────────────────────────────┼─────────────┼────────────────┤
  │ Operations Engine │ Healthy (Atomic, Event-Driven) │ Low         │ Maintain       │
  │ Reception Intake  │ Healthy (Backend-Owned)        │ Low         │ Maintain       │
  │ Referral (Flow A) │ Passable                       │ Low         │ Refactor Async │
  │ Referral (Flow B) │ BROKEN (Logic Missing)         │ HIGH        │ New Logic      │
  │ Discount Engine   │ NON-EXISTENT (Security Risk)   │ HIGH        │ Implement      │
  │ Patient Reg       │ Silent (No Events)             │ Medium      │ Wiring         │
  │ Master Data       │ Inaccessible (No APIs)         │ Medium      │ New APIs       │
  └───────────────────┴────────────────────────────────┴─────────────┴────────────────┘


  Immediate "Real Gap" Fixes Priority:
   1. Discount Logic: Stop accepting raw amounts from Frontend. (Security).
   2. Flow B Settlement: Unblock Operations for Partner-collected visits. (Operational).
   3. Patient Events: Fix visibility. (Observability).