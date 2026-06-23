# SynOS Workflow Architecture

# Reception

Responsibilities:

- Patient Registration
- Visit Creation
- Test Selection
- Billing
- Payment Confirmation

Output:

- Orders
- Visit
- Workflow Routing

---

# Routing Rules

## Pathology

After payment:

Ready for Sample

Queue:

Phlebotomy

---

## Radiology

After payment:

Direct technician routing.

No specimen planning.

No sample collection.

---

# Phlebotomy

Responsibilities:

- Collect specimens
- Label samples
- Mark collection complete

Live Queue:

- Ready for Sample
- Pending Collection

History Queue:

- Collected
- In Processing
- Reporting
- Reported
- Delivered

---

# Workbench

Responsibilities:

- Processing
- Analyzer Entry
- Result Entry
- Draft Saving

Outputs:

- Results
- Draft Report

Possible actions:

1. Save Draft
2. Complete Processing
3. Skip To Typist

---

# Typist

Responsibilities:

- Clinical Interpretation
- Narrative Entry
- Report Formatting

Consumes:

Draft Reports

Produces:

Ready For Verification Reports

---

# Pathologist

Responsibilities:

- Verification
- Sign Off

Outputs:

Signed Reports

---

# Delivery

Responsibilities:

- Print
- Email
- WhatsApp
- Collection Confirmation

Terminal State:

Delivered

---

# Radiology Workflow

Reception
→ Technician
→ Typist
→ Radiologist
→ Delivery

Radiology does not enter:

- Phlebotomy
- Workbench

---

# Operational Status Definitions

Ready for Sample

Patient paid.
Awaiting collection.

---

Pending Collection

Assigned to collector.

---

Collected

Collection complete.

---

In Processing

Processing underway.

---

Reporting

Draft report exists.

---

Reported

Report completed.

---

Delivered

Patient received report.