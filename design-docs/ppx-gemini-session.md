---
### **Analysis of Missing Endpoints & Flow Gaps**

Based on the simulation, here is a list of functionalities and the corresponding API endpoints that are either missing, were assumed to exist, or are not fully connected in the current backend.

#### **1. Test Master & Pricing (Critical Missing Piece)**

*   **Gap:** The simulation starts with `POST /api/v1/visits` and provides `testCodes`. However, the system has no way of knowing what "CBC" or "XRAY_CHEST" are, what department they belong to, or how much they cost.
*   **Missing Endpoints:**
    *   `GET /api/v1/tests?search=...`: An endpoint for the reception UI to search for available tests.
    *   `POST /api/v1/admin/tests`: An endpoint for an admin to create a new test (e.g., name: "Complete Blood Count", code: "CBC", department: "Pathology", price: 250.00).
    *   `PUT /api/v1/admin/tests/{testId}`: To update test details.
    *   `GET /api/v1/admin/tests`: To list all tests.

#### **2. Radiology Reporting (Partially Missing)**

*   **Gap:** In Step 11, we assumed an endpoint exists for the radiologist to save their findings and impression. The simulation used a conceptual `PUT /api/v1/radiology-reports/{reportId}`. This needs to be built.
*   **Missing Endpoints:**
    *   `PUT /api/v1/radiology-reports/{reportId}`: To save or update the `findings` and `impression` text for a radiology report.
    *   `GET /api/v1/radiology-reports/{reportId}`: To fetch the current draft of the report to display to the radiologist.

#### **3. User & Role Management (Assumed)**

*   **Gap:** The simulation assumes that users like `reception@synos.com` exist and have the correct roles. While we have an `Auth` controller, the ability to create and manage these users is a prerequisite.
*   **Missing Endpoints:**
    *   `GET /api/v1/admin/users`: To list all users.
    *   `POST /api/v1/admin/users`: To create a new user and assign them a role.
    *   `PUT /api/v1/admin/users/{userId}`: To update a user's role or status.
    *   `GET /api/v1/admin/roles`: To list available roles in the system.

#### **4. Sample Collection & Barcode Generation (Partially Missing)**

*   **Gap:** The simulation uses `POST /api/v1/samples/collect`. While plausible, the details of how a barcode is generated and linked are missing. Does the backend generate the barcode string? What happens if a sample is rejected and needs a new barcode?
*   **Missing Endpoints/Features:**
    *   A clear endpoint to generate a new, unique barcode for a sample, perhaps `POST /api/v1/samples/{sampleId}/generate-barcode`.
    *   The `POST /api/v1/samples/collect` needs to be implemented to correctly update the sample's status.

#### **5. Pathologist's Worklist (Implicit)**

*   **Gap:** How does the pathologist know which reports are `ReadyForSignature`? The simulation assumes they can just call `POST /api/v1/reports/{reportId}/sign`, but they first need a way to see their worklist.
*   **Missing Endpoints:**
    *   `GET /api/v1/reports/queue?status=ReadyForSignature`: An endpoint to list all reports assigned to the currently logged-in pathologist that are ready to be signed.

#### **6. Radiologist's Worklist (Implicit)**

*   **Gap:** Similar to the pathologist, the radiologist needs a worklist to see which studies have been scanned and are ready for reporting.
*   **Missing Endpoints:**
    *   `GET /api/v1/radiology/studies/queue?status=ReadyForReporting`: An endpoint to list studies that have DICOM images uploaded and are waiting for a radiologist's report.

---

### **Summary of Gaps for Upcoming Build Days:**

To make the simulated flow fully functional, the following backend components need to be built, in roughly this order of priority:

1.  **Day 15: Test Master & Pricing:** Implement full CRUD for tests and their prices. The `POST /api/v1/visits` endpoint must be updated to use this master list to generate orders and invoices correctly.
2.  **Day 16: User Management:** Build the administrative endpoints for creating and managing users and their roles.
3.  **Day 17: Worklist Queues:** Create the API endpoints that will serve as the worklists for the phlebotomist, lab technician, pathologist, and radiologist.
4.  **Day 18: Radiology Reporting:** Implement the endpoint to save the radiologist's findings and impressions.
5.  **Day 19: Barcode Generation & Sample Management:** Solidify the sample collection and barcode generation logic.

This analysis provides a clear roadmap for the next several "build days" to fill in the missing pieces of the end-to-end workflow.