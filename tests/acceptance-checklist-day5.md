# Day 5 Acceptance Checklist

This checklist covers manual testing steps for the features implemented on Day 5, including priority fixes and the new token numbering system.

## Setup

1.  Ensure the backend (.NET API) is running.
2.  Ensure the frontend (React app) is running.
3.  Log in as `admin@lab.com` (password: `Admin`).

## Priority Fixes Verification

*   **RowVersion (Optimistic Concurrency):**
    *   **Test:** Attempt to update a patient record from two different browser tabs simultaneously. The second update should fail with a concurrency error.
    *   **Expected:** One update succeeds, the other fails with a clear error message indicating a concurrency conflict.
*   **PK Consistency (GUIDs):**
    *   **Test:** Create a new patient, appointment, and visit. Observe the IDs generated in the network tab (API responses) and in the database (if accessible).
    *   **Expected:** All generated IDs (`PatientId`, `AppointmentId`, `VisitId`, `OrderId`, `InvoiceId`, `PaymentId`, `CreditNoteId`, `TokenCounterId`, `AuditLogId`, `UserId`, `RoleId`) are GUIDs.
*   **TokenCounter.Day (Local Date):**
    *   **Test:** Create a visit. Check the `TokenDate` in the database for the created visit and the `Day` in the `TokenCounter` table.
    *   **Expected:** Both `TokenDate` and `Day` should reflect the server's local date (midnight reset).
*   **TestDefinition Entity (Real Prices):**
    *   **Test:** Create a visit with "CBC" and "FBS" tests. Review the generated invoice.
    *   **Expected:** The invoice total should reflect the prices from the seeded `TestDefinition`s (CBC: 150.00, FBS: 100.00) plus the 5% tax.

## Token Numbering System

*   **Test:**
    1.  Create a new visit for "Pathology". Note the token (e.g., `AP-001`).
    2.  Create another visit for "Pathology". Note the token (e.g., `AP-002`).
    3.  Repeat until the number reaches `AP-999`.
    4.  Create one more visit for "Pathology".
    *   **Expected:**
        *   Tokens follow the format `{Series}{DEPT_LETTER}-{number:D3}` (e.g., `AP-001`).
        *   The number increments correctly.
        *   After `AP-999`, the next token should be `BP-001`.
        *   If `ZZ-999` is reached (not easily testable manually, but conceptually), an error "Token space exhausted" should be thrown.
*   **Test:** Create visits for different departments (e.g., "Pathology" and "Radiology").
*   **Expected:** Each department maintains its own token series (e.g., `AP-xxx` for Pathology, `AX-xxx` for Radiology).

## Backend Functionality

*   **CreateVisit (`POST /api/v1/visits`):**
    *   **Test:** Use the updated `visits-curl.sh` script to create a visit.
    *   **Expected:**
        *   API returns a `Visit` DTO including `VisitId`, `Token`, and `Invoice` object with calculated `GrossAmount`, `NetAmount`, `TaxAmount`, `Total`.
        *   The `Idempotency-Key` header is sent and the API handles it (no duplicate visit if same key sent twice within a short period).
        *   Patient and Test Definitions are correctly looked up.
        *   `Visit`, `Order`, `Invoice` records are created in the database.
*   **RecordPayment (`POST /api/v1/visits/{id}/payment`):**
    *   **Test:** Use `visits-curl.sh` to record a full payment for a pending visit.
    *   **Expected:**
        *   API returns the `Payment` object.
        *   `Invoice.Status` and `Visit.Status` change to "Paid".
        *   A `Payment` record is created in the database.
    *   **Test:** Use `visits-curl.sh` to record a partial payment for a pending visit.
    *   **Expected:**
        *   API returns the `PartialPayment` object.
        *   `Invoice.Status` and `Visit.Status` change to "PartialPayment".
        *   A `PartialPayment` record is created in the database.
*   **CancelVisit (`POST /api/v1/visits/{id}/cancel`):**
    *   **Test:** Use `visits-curl.sh` to cancel a visit.
    *   **Expected:**
        *   API returns the `VisitCancellation` object.
        *   `Visit.Status` and `Invoice.Status` change to "Cancelled".
        *   A `VisitCancellation` record is created in the database.
        *   If payments were made, a `CreditNote` is created.
*   **GetVisitDetails (`GET /api/v1/visits/{id}`):**
    *   **Test:** Use `visits-curl.sh` to get visit details.
    *   **Expected:** Returns comprehensive details including `Patient`, `Orders` (with `TestDefinition` details), `Invoice` (with `Payments` and `PartialPayments`).
*   **GetVisitToken (`GET /api/v1/visits/{id}/token`):**
    *   **Test:** Use `visits-curl.sh` to get token details.
    *   **Expected:** Returns `TokenPrintDto` with `Token`, `MRN`, `PatientName`, `VisitTime`.

## Frontend Functionality

*   **ReceptionCheckinFlow:**
    *   **Test:** Navigate to `/visits` (or the page hosting `ReceptionCheckinFlow`).
    *   **Expected:**
        *   Step 1: Patient Search works.
        *   Step 2: Test Selection displays tests fetched from the API (e.g., CBC, FBS, USG, XRAY_CHEST, CT_HEAD) with their correct prices.
        *   Step 4: Invoice Preview correctly calculates and displays Gross, Net, Tax, and Total based on selected tests' prices.
        *   Step 5: Payment Capture Modal appears after "Confirm & Create Visit". It should show the correct total amount from the created invoice.
        *   Step 6: Token Preview Modal appears after successful payment, displaying the new token format, patient MRN, name, and visit time. The "Print Token" button should trigger the browser's print dialog for the token area.
*   **VisitListPage:**
    *   **Test:** Navigate to `/visits`.
    *   **Expected:**
        *   The list displays visits with their new token format, patient names, invoice totals, and statuses.
        *   "Record Payment" button is enabled for "PendingPayment" or "PartialPayment" visits. Clicking it opens the `PaymentCaptureModal`.
        *   "Print Token" button is available for all visits. Clicking it fetches token details and opens the `TokenPreview` modal.
        *   "Cancel Visit" button is enabled for non-cancelled visits. Clicking it cancels the visit and updates its status.
*   **PaymentCaptureModal:**
    *   **Test:** Open the modal from `ReceptionCheckinFlow` or `VisitListPage`. Enter a partial amount.
    *   **Expected:** The API call for payment should succeed, and the visit status should update to "PartialPayment".
*   **TokenPreview Component:**
    *   **Test:** Open the modal from `ReceptionCheckinFlow` or `VisitListPage`.
    *   **Expected:** Displays the token, MRN, patient name, and visit time in a large, clear format. The "Print Token" button should work.

## Open TODOs / Blockers

*   **Idempotency:** Full implementation of idempotency record table is a TODO.
*   **Department Letter Mapping:** Configuration for department letter mapping (e.g., "Pathology" -> "P") is a TODO.
*   **Tax and Discount Logic:** Placeholder tax calculation and missing discount logic are TODOs.
*   **Refund Process Integration:** Actual refund process integration after cancellation is a TODO.
*   **AuditLog for Token Generation:** Logging token generation events in AuditLog is a TODO.
*   **Dynamic Department Options:** The department dropdown in `VisitListPage` is hardcoded; it should be dynamic from API.
*   **User ID for AuditLog:** Passing actual `UserId` from context to `AuditLog` is a TODO.
*   **EF Core Migration:** The `dotnet ef migrations add` command failed, so the migration files were not generated. This is a blocker for database schema updates.
*   **Frontend `dayjs` and `uuid` installation:** `package.json` was updated, but `npm install` was not run.

This concludes the implementation for Day 5 features and priority fixes.
