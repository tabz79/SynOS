# Day 4 Acceptance Checklist: Appointments & Same-Day Grouping

This checklist is for the Product Owner to verify the successful implementation of Day 4 features.

## Prerequisites
1.  Backend is running.
2.  Frontend is running.
3.  Database migrations for `AddAppointmentTables` have been applied.
4.  The database has been seeded with test users, patients, and appointments.

## Verification Steps

### Backend API

-   [ ] **Create Appointment:**
    -   Send a `POST` request to `/api/v1/appointments` with a valid patient ID, future `scheduledFor` time, department, and a unique `Idempotency-Key` header.
    -   **Expected:** Receive a `201 Created` response with the new appointment details.
-   [ ] **Idempotency Check:**
    -   Immediately re-send the exact same `POST` request from the previous step (with the same `Idempotency-Key`).
    -   **Expected:** The API should not create a duplicate appointment. It should ideally return the original `201 Created` response or a `409 Conflict` indicating the key has been used.
-   [ ] **Slot Collision:**
    -   Send a `POST` request to book an appointment in the exact same time slot and department as an existing appointment.
    -   **Expected:** Receive a `409 Conflict` response with the error code `SLOT_FULL`.
-   [ ] **Same-Day Visit Check:**
    -   Send a `GET` request to `/api/v1/patients/{id}/same-day-visits?date=YYYY-MM-DD` for the patient seeded with two same-day appointments (`TC-A00002`).
    -   **Expected:** Receive a `200 OK` response with `hasSameDayVisits: true`, `suggestCombineBilling: true`, and a list of the two appointments.
-   [ ] **Reschedule Appointment:**
    -   Send a `POST` request to `/api/v1/appointments/{id}/reschedule` with a new `newScheduledForUtc`.
    -   **Expected:** Receive a `200 OK` response with the updated appointment. Verify the `UpdatedAt` and `ScheduledFor` fields have changed. Check the `AuditLog` table for a "RescheduleAppointment" entry.
-   [ ] **Cancel Appointment:**
    -   Send a `POST` request to `/api/v1/appointments/{id}/cancel` with a reason.
    -   **Expected:** Receive a `200 OK` response. The appointment's status should be `Cancelled`. Check the `AuditLog` table for a "CancelAppointment" entry.
-   [ ] **Authorization:**
    -   Attempt to use the `create`, `reschedule`, or `cancel` endpoints while authenticated as a user without the 'Admin' or 'Reception' role (e.g., `pathtech@lab.com`).
    -   **Expected:** Receive a `403 Forbidden` response.

### Frontend UI

-   [ ] **Book Appointment:**
    -   Log in as a 'Reception' user.
    -   Navigate to the "Appointments" page.
    -   Use the "Book an Appointment" form: select a patient, date, time, and department.
    -   Click "Book Appointment".
    -   **Expected:** A success message appears, and the form resets. The new appointment appears in the "Upcoming Appointments" list.
-   [ ] **List Upcoming Appointments:**
    -   On the "Appointments" page, select a department and date.
    -   **Expected:** The list updates to show all booked appointments for that day and department, sorted by time.
-   [ ] **Cancel Appointment from UI:**
    -   In the "Upcoming Appointments" list, click the "Cancel" button for an appointment.
    -   Confirm the cancellation in the browser's confirmation dialog.
    -   **Expected:** The appointment is removed from the list.
-   [ ] **Same-Day Visit Warning:**
    -   (This requires a "Check-in" UI not built yet).
    -   **To simulate:** Manually place the `<SameDayVisitWarning />` component on the `PatientDetailPage` for the patient with same-day visits (`TC-A00002`).
    -   **Expected:** A yellow warning banner appears, listing the other appointments for that day and showing "Combine Billing" and "Create New Visit" buttons.
-   [ ] **Role-Based UI:**
    -   Log in as a user without 'Reception' or 'Admin' roles.
    -   **Expected:** The "Appointments" link in the main navigation should not be visible. Direct navigation to `/appointments` should be blocked by the `ProtectedRoute`.
