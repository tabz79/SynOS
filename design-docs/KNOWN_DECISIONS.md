# KNOWN_DECISIONS.md

# SynOS Architectural Decision Log

This document records important architectural decisions, workflow rules, bug discoveries, and design constraints.

If a future implementation conflicts with this document, the conflict must be reviewed before proceeding.

---

# Department Architecture

## Canonical Departments

SynOS recognizes two primary operational departments:

* Pathology
* Radiology

Imported catalog aliases may include:

* LAB
* HEM
* BIO
* RAD

These aliases must be normalized into the canonical department model.

---

# Workflow Architecture

## Pathology Workflow

Reception
→ Phlebotomy
→ Workbench
→ Typist
→ Pathologist
→ Delivery

---

## Radiology Workflow

Reception
→ Technician
→ Typist
→ Radiologist
→ Delivery

Radiology bypasses:

* Specimen Planning
* Sample Collection
* Laboratory Workbench

---

# Queue Architecture

## Queues Are Projections

Queues are not source tables.

Queues are derived views generated from operational state.

No screen should maintain its own workflow truth.

Operational state remains the source of truth.

---

# Phlebotomy Queue Rules

## Live Queue

Allowed statuses:

* Ready for Sample
* Pending Collection

Purpose:

Active work waiting for collection.

---

## History Queue

Allowed statuses:

* Collected
* In Processing
* Reporting
* Reported
* Delivered

Purpose:

Audit and review of previously collected specimens.

---

## Radiology Queue Incident

Issue discovered:

Radiology patients appeared in the Phlebotomy queue.

Root cause:

PhlebotomyScreen filtered solely on operational status.

Radiology reports entered Reporting status and incorrectly satisfied the filter.

Resolution:

Live queue restricted to:

* Ready for Sample
* Pending Collection

History queue separated from active collection queue.

---

# Typist Queue Rules

Current architecture:

Typist queue is populated only after a draft report exists.

A draft report is created through Workbench completion workflows.

---

## Workbench Required

Current behavior:

Collection completion alone does not create a draft report.

Required actions:

* Save Draft
  or
* Complete Processing
  or
* Skip To Typist

Result:

Draft report becomes available to Typist.

---

## Future Enhancement

Possible future workflow:

Collection Complete
→ Automatically create draft report
→ Typist receives queue immediately

Decision:

Deferred.

Current architecture remains unchanged.

---

# Report Architecture

## Reports Are Snapshot Based

Reports are generated from immutable snapshots.

A snapshot represents the report structure at generation time.

Changes to catalog definitions must not modify previously generated reports.

---

## Report Lifecycle

Draft
→ Ready For Verification
→ Signed
→ Delivered

---

# Catalog Architecture

## Profiles

Profiles may contain:

1. Child Tests
2. Native Parameters

Both configurations are valid.

---

## Important Rule

A profile must not contain duplicate analytes.

Bad example:

LFT
├── SGOT (native parameter)
└── SGOT child test

Result:

Duplicate report rows.

---

# LFT Duplicate Report Incident

Date:

June 2026

Symptoms:

LFT reports displayed duplicate analytes.

Examples:

* Albumin
* SGOT
* SGPT
* Bilirubin
* Total Protein

Root Cause:

LFT profile contained:

* Child test parameters
* Profile-native parameters

The report snapshot builder merged both sets.

No deduplication existed.

---

## Discovery

Snapshot generation reads:

Catalog_Parameters

Not:

Parameters

This distinction is critical.

---

## Resolution

Redundant profile-native catalog parameters removed from:

LFT_LIVER_FUNCT

Affected parameters:

* ALBUMIN
* ALP
* BILIRUBIN_DIREC
* BILIRUBIN_TOTAL
* GLOBULIN
* SGOT
* SGPT
* TOTAL_PROTEIN
* A_G_RATIO

Result:

Duplicate analytes removed from generated reports.

---

# Lipid Profile Review

Finding:

Profile-native parameters duplicated analytes already supplied by child tests.

Examples:

* HDL
* LDL
* VLDL
* Total Cholesterol
* Triglycerides

Resolution:

Redundant native catalog parameters removed.

---

# Diabetic Profile Review

Finding:

Profile-native fasting glucose duplicated analyte supplied through child tests.

Resolution:

Redundant native parameter removed.

---

# Snapshot Builder Behavior

Current behavior:

BuildDynamicStructureAsync merges:

* Profile-native parameters
* Child-test parameters

No deduplication occurs.

Implication:

Catalog design must avoid duplicate analytes.

---

# Operational Status Rules

Ready for Sample

Patient paid.
Awaiting specimen collection.

---

Pending Collection

Assigned to collector.

---

Collected

Specimen collected.

---

In Processing

Workbench activity underway.

---

Reporting

Draft report exists.

---

Reported

Report completed.

---

Delivered

Report delivered to patient.

---

# Debugging Lessons

Before modifying code:

1. Verify actual workflow.
2. Trace database state.
3. Identify source of truth.
4. Confirm which table the feature reads from.
5. Avoid assuming UI screens and reports use the same data source.

Example:

Test Master UI used Catalog_Parameters while previous investigation focused on Parameters.

This distinction caused significant debugging delay.

---

# Future Rule

Whenever a workflow bug is solved:

Add a short entry to this file.

The goal is to prevent the same investigation from being repeated in future releases.
