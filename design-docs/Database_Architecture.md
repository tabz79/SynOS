# SynOS Database Architecture

# Core Entities

## Visit

Represents patient visit.

Contains:

- VisitId
- Token
- Patient
- Branch
- Status

---

## Order

Represents requested test.

Contains:

- OrderId
- VisitId
- TestId
- Department
- Status

---

## Test

Represents diagnostic test.

Contains:

- TestId
- TestCode
- TestName
- Department

Supports:

- Single Test
- Profile Test

---

## Parameter

Represents measurable analyte.

Examples:

- Hemoglobin
- SGOT
- SGPT
- Albumin

---

## ProfileMap

Maps profile tests to child tests.

Example:

LFT
→ SGOT
→ SGPT
→ Albumin

---

## Result

Stores measured values.

Contains:

- OrderId
- ParameterCode
- Value

---

## Report

Represents generated report.

Contains:

- ReportId
- VisitId
- Status

Statuses:

- Draft
- ReadyForVerification
- Signed

---

## ReportVersion

Version history.

Immutable.

---

## ReportSnapshot

Frozen report structure.

Generated during report creation.

---

# Catalog Architecture

## Catalog_Parameters

Master catalog definitions.

Used by:

- Snapshot Generation
- Test Master

Important:

Report generation currently reads Catalog_Parameters.

---

## Parameters

Runtime parameter definitions.

---

# Department Model

Canonical Departments:

- Pathology
- Radiology

Imported aliases:

- LAB
- HEM
- BIO
- RAD

Must normalize into canonical departments.

---

# Important Architectural Decisions

## Profiles

Profiles can contain:

1. Child Tests
2. Native Parameters

Both are allowed.

However duplicate analytes must not exist simultaneously.

Example:

Bad:

LFT
├── SGOT (native)
└── SGOT test

Result:
Duplicate report rows.

---

## Reports

Report snapshots are immutable.

Editing catalog definitions must not alter previously generated reports.

---

## Queue System

Queues are projections.

Queues are not source tables.

Operational status drives queue visibility.