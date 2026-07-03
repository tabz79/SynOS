# SynOS - Product Brain

## What is SynOS?

SynOS is a Diagnostics Lab Operating System designed for high-throughput diagnostic laboratories.

It is not merely a Lab Management System (LMS/LIMS).

Its primary objective is operational control of the laboratory from patient arrival to report delivery.

Core philosophy:

- Fast
- Reliable
- Operational First
- Low Hardware Friendly
- Queue Driven
- Role Based
- Zero Ambiguity Workflows

---

# Core Patient Journey

Patient Arrival
→ Reception
→ Billing
→ Payment Confirmation
→ Sample Collection / Radiology Routing
→ Processing Workbench
→ Typing
→ Verification
→ Delivery

---

# Primary Departments

## Pathology

Handles:

- Hematology
- Biochemistry
- Clinical Pathology
- Microbiology
- Serology
- Immunology

Workflow:

Reception
→ Phlebotomy
→ Workbench
→ Typist
→ Pathologist
→ Delivery

---

## Radiology

Handles:

- X-Ray
- Ultrasound
- CT
- MRI

Workflow:

Reception
→ Technician
→ Typist
→ Radiologist
→ Delivery

Radiology bypasses:

- Sample Collection
- Lab Workbench

---

# Core Design Principles

## Operational Status Driven

All queues derive from operational state.

Examples:

- Ready for Sample
- Pending Collection
- Collected
- In Processing
- Reporting
- Reported
- Delivered

---

## Single Source of Truth

Operational state is derived centrally.

Frontend screens must not invent workflow rules.

---

## Report First Architecture

Reports are generated from snapshot structures.

Snapshots represent immutable report data at a specific point in time.

---

## Catalog Driven

Tests, parameters, profiles and report structures are driven from catalog definitions.

No hardcoded medical definitions in UI.

---

# Product Goals

1. Diagnostics Labs
2. Diagnostic Chains
3. Multi Branch Labs
4. Radiology Centers
5. Pathology Centers

---

# Non Goals

- Hospital EMR
- IP Billing
- Pharmacy Management
- General ERP

These may integrate later but are not core.

---

# Implemented Extensions

## QuestPDF Absolute A4 Coordinate Engine
* Reports are rendered dynamically via QuestPDF using templates designed in React.
* When `enableAbsolutePositioning` is true, the default flow table is skipped. All patient metadata is positioned at precise `X` and `Y` coordinate offsets (in millimeters) relative to the page canvas, enabling compatibility with preprinted background paper letterheads.

## Transactional Outbox Sync Middleware
* Patient visits and report delivery request actions enqueued in the local outbox database table are picked up by `MiddlewareSyncWorker` and synced to the standalone TBZ Middleware (port 5069) for WhatsApp dispatching.

-------

##Technical Debt:
Parameter definitions are duplicated between standalone tests and profile tests.

##Future architecture:
Introduce ParameterMaster and TestParameterLinks.

Target version:
Post-MVP / v2 architecture migration.