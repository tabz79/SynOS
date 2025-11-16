# Authentication Testing Guide

This document outlines manual testing steps for the authentication and authorization features implemented in SynOS.

## Prerequisites

1.  Ensure the backend API is running.
2.  Ensure the database has been migrated and seeded with the initial user data (admin@lab.com, reception@lab.com, etc.).
3.  Ensure the frontend application is running.

## Manual Test Cases

### 1. User Login
...
(existing content)
...
### 9. Backend API Error Handling
...
(existing content)
...

---

## Patient Management Testing

### 1. Patient Search

**Objective:** Verify that a user with the 'Reception' or 'Admin' role can search for patients.

*   **Steps:**
    1.  Log in as `reception@lab.com` or `admin@lab.com`.
    2.  Navigate to the "Patients" page.
    3.  In the search box, type a partial name, MRN, or phone number of a test patient (e.g., "Test", "TC-A00001", "555-0100").
*   **Expected Result:**
    *   An autocomplete dropdown appears with matching patients.
    *   Selecting a patient from the list displays them in the grid below.

### 2. View Patient Details & Phone History

**Objective:** Verify that clicking a patient navigates to their detail page and shows correct information.

*   **Steps:**
    1.  Perform a patient search as described above.
    2.  Click on a patient row in the `PatientListGrid`.
*   **Expected Result:**
    *   The user is navigated to the patient's detail page (e.g., `/patients/<patient_id>`).
    *   The page displays the patient's MRN, name, DOB, gender, and current phone number.
    *   The "Phone Number History" section shows the patient's current and any previous phone numbers with start and end dates.

### 3. Duplicate Detection

**Objective:** Verify the duplicate detection functionality.

*   **Steps:**
    1.  Navigate to the detail page of a patient who has a likely duplicate (e.g., another patient with the same phone number and a similar name).
    2.  Click the "Check Duplicates" button.
*   **Expected Result:**
    *   A modal window ("Possible Duplicates") opens.
    *   The modal lists potential duplicate patients, showing their name, MRN, and a match percentage.
    *   If no duplicates are found, a message indicates that.

### 4. Merge Preview

**Objective:** Verify that the merge preview provides an accurate summary of the merge operation.

*   **Steps:**
    1.  From the "Possible Duplicates" modal, click the "Preview Merge" button for one of the duplicates.
*   **Expected Result:**
    *   A "Merge Preview" section appears in the modal.
    *   It displays the number of visits, samples, phone history records, etc., that will be moved from the source patient to the target patient.
    *   The "Confirm & Merge" button is disabled.

### 5. Patient Merge

**Objective:** Verify that two patient records can be successfully merged.

*   **Steps:**
    1.  In the "Merge Preview" section, check the "I have reviewed the preview and confirm the merge" checkbox.
    2.  The "Confirm & Merge" button becomes enabled. Click it.
*   **Expected Result:**
    *   An alert "Merge successful!" appears.
    *   The modal closes.
    *   The source patient is now soft-deleted and should not appear in searches.
    *   The target patient's record now contains the merged data (e.g., phone history from the source patient).
    *   An audit log entry for the merge is created in the database.

### 6. Merge Authorization

**Objective:** Verify that only authorized users can perform a merge.

*   **Steps:**
    1.  Log in as a user without 'Admin' or 'Reception' roles (e.g., `pathtech@lab.com`).
    2.  Attempt to perform a merge operation by sending a direct API request to `POST /api/v1/patients/merge` (using Postman or cURL).
*   **Expected Result:**
    *   The API should return a `403 Forbidden` status code.
    *   The frontend UI for merging should ideally not be visible to unauthorized users, but the API must enforce the rule regardless.