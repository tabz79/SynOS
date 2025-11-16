<!-- Master generated 2025-11-09 08:35 IST -->
# SynOS – System Specification Document

# Table of Contents
- [SynOS – System Specification Document](#synos-system-specification-document)
  - [1. Overview](#1-overview)
  - [2. Core Roles & Screens](#2-core-roles-screens)
    - [2.1 Universal Screens (Common for All Departments)](#21-universal-screens-common-for-all-departments)
    - [2.2 Department-Specific Screens](#22-department-specific-screens)
  - [3. Workflow Summaries](#3-workflow-summaries)
    - [3.1 Reception Desk (Common)](#31-reception-desk-common)
  - [4. Pathology Workflow](#4-pathology-workflow)
    - [4.1 Sample Collection Desk](#41-sample-collection-desk)
    - [4.2 Pathology Lab Technician](#42-pathology-lab-technician)
    - [4.3 Pathologist](#43-pathologist)
  - [5. Radiology Workflow](#5-radiology-workflow)
    - [5.1 Radiology Technician (X-ray/MRI/CT)](#51-radiology-technician-x-raymrict)
    - [5.2 Radiologist](#52-radiologist)
  - [6. Delivery Desk (Common)](#6-delivery-desk-common)
  - [7. Referral Handling](#7-referral-handling)
    - [7.1 Case A: Prepaid by Referrer (Doctor/Hospital)](#71-case-a-prepaid-by-referrer-doctorhospital)
    - [7.2 Case B: Referral with Commission](#72-case-b-referral-with-commission)
  - [8. Admin Panel – Full Access](#8-admin-panel-full-access)
  - [9. Reporting System](#9-reporting-system)
  - [10. Technical Architecture Summary](#10-technical-architecture-summary)
    - [10.1 Frontend](#101-frontend)
    - [10.2 Backend](#102-backend)
    - [10.3 Database](#103-database)
    - [10.4 File Storage](#104-file-storage)
    - [10.5 Deployment](#105-deployment)
  - [11. Barcode Rules](#11-barcode-rules)
  - [12. Status Machine Summary](#12-status-machine-summary)
  - [13. Delivery Rules](#13-delivery-rules)
  - [14. HR & Payroll Management Screen](#14-hr-payroll-management-screen)
  - [15. AI Readiness Layer (Design)](#15-ai-readiness-layer-design)
    - [15.1 Goals](#151-goals)
    - [15.2 Data Tracks](#152-data-tracks)
    - [15.3 Data Lake Layout](#153-data-lake-layout)
    - [15.4 De-identification Rules](#154-de-identification-rules)
    - [15.5 Pathology Pack](#155-pathology-pack)
    - [15.6 Radiology Pack](#156-radiology-pack)
    - [15.7 Export Job (Client-Side)](#157-export-job-client-side)
    - [15.8 Ingest Job (Your Side)](#158-ingest-job-your-side)
    - [15.9 Privacy & Control](#159-privacy-control)
  - [16. Future Modules (Optional)](#16-future-modules-optional)
- [SynOS – System Specification Document](#synos-system-specification-document)
  - [1. Overview](#1-overview)
  - [2. Core Roles & Screens](#2-core-roles-screens)
    - [2.1 Universal Screens (Common for All Departments)](#21-universal-screens-common-for-all-departments)
    - [2.2 Department-Specific Screens](#22-department-specific-screens)
  - [3. Workflow Summaries](#3-workflow-summaries)
    - [3.1 Reception Desk (Common)](#31-reception-desk-common)
  - [4. Pathology Workflow](#4-pathology-workflow)
    - [4.1 Sample Collection Desk](#41-sample-collection-desk)
    - [4.2 Pathology Lab Technician](#42-pathology-lab-technician)
    - [4.3 Pathologist](#43-pathologist)
  - [5. Radiology Workflow](#5-radiology-workflow)
    - [5.1 Radiology Technician (X-ray/MRI/CT)](#51-radiology-technician-x-raymrict)
    - [5.2 Radiologist](#52-radiologist)
  - [6. Delivery Desk (Common)](#6-delivery-desk-common)
  - [7. Referral Handling](#7-referral-handling)
    - [7.1 Case A: Prepaid by Referrer (Doctor/Hospital)](#71-case-a-prepaid-by-referrer-doctorhospital)
    - [7.2 Case B: Referral with Commission](#72-case-b-referral-with-commission)
  - [8. Admin Panel – Full Access](#8-admin-panel-full-access)
  - [9. Reporting System](#9-reporting-system)
  - [10. Technical Architecture Summary](#10-technical-architecture-summary)
    - [10.1 Frontend](#101-frontend)
    - [10.2 Backend](#102-backend)
    - [10.3 Database](#103-database)
    - [10.4 File Storage](#104-file-storage)
    - [10.5 Deployment](#105-deployment)
  - [11. Barcode Rules](#11-barcode-rules)
  - [12. Status Machine Summary](#12-status-machine-summary)
  - [13. Delivery Rules](#13-delivery-rules)
  - [14. HR & Payroll Management Screen](#14-hr-payroll-management-screen)
  - [15. AI Readiness Layer (Design)](#15-ai-readiness-layer-design)
    - [15.1 Goals](#151-goals)
    - [15.2 Data Tracks](#152-data-tracks)
    - [15.3 Data Lake Layout](#153-data-lake-layout)
    - [15.4 De-identification Rules](#154-de-identification-rules)
    - [15.5 Pathology Pack](#155-pathology-pack)
    - [15.6 Radiology Pack](#156-radiology-pack)
    - [15.7 Export Job (Client-Side)](#157-export-job-client-side)
    - [15.8 Ingest Job (Your Side)](#158-ingest-job-your-side)
    - [15.9 Privacy & Control](#159-privacy-control)
  - [16. Non‑Functional Requirements (Production Readiness)](#16-nonfunctional-requirements-production-readiness)
    - [16.0 Modern Infinite Scroll (Cursor‑Based Pagination)](#160-modern-infinite-scroll-cursorbased-pagination)
  - [16. Non‑Functional Requirements (Production Readiness) (Production Readiness)](#16-nonfunctional-requirements-production-readiness-production-readiness)
    - [16.1 Throughput & Scale Targets](#161-throughput-scale-targets)
    - [16.2 Architecture Patterns](#162-architecture-patterns)
    - [16.3 SQL Server Hardening](#163-sql-server-hardening)
    - [16.4 Observability](#164-observability)
    - [16.5 Reliability & Safety](#165-reliability-safety)
  - [17. Undo, Corrections & Versioning Model](#17-undo-corrections-versioning-model)
    - [17.1 Principles](#171-principles)
    - [17.2 Examples](#172-examples)
    - [17.3 Mechanics](#173-mechanics)
  - [18. AI Assistant Layer (Frontend & Backend Design)](#18-ai-assistant-layer-frontend-backend-design)
    - [18.1 Placement (Frontend)](#181-placement-frontend)
    - [18.2 Access Control](#182-access-control)
    - [18.3 Backend](#183-backend)
    - [18.4 Imaging](#184-imaging)
    - [18.5 Safety](#185-safety)
  - [19. Role‑Specific AI Use Cases (MVP)](#19-rolespecific-ai-use-cases-mvp)
  - [20. Deployment Topology (On‑Prem)](#20-deployment-topology-onprem)
  - [21. Security & Privacy](#21-security-privacy)
  - [22. Readiness Checklist (Pre‑Go‑Live)](#22-readiness-checklist-pregolive)
  - [23. Future Modules (Optional)](#23-future-modules-optional)
  - [24. AI Assistant Layer — Detailed Spec (Clarifies Section 18)](#24-ai-assistant-layer-detailed-spec-clarifies-section-18)
    - [24.1 Frontend Placement & UX](#241-frontend-placement-ux)
    - [24.2 Context Bundle Schema (Runtime, Not Training)](#242-context-bundle-schema-runtime-not-training)
    - [24.3 Backend Components](#243-backend-components)
    - [24.4 Imaging Strategy](#244-imaging-strategy)
    - [24.5 Role-Specific Prompts (Prebuilt)](#245-role-specific-prompts-prebuilt)
    - [24.6 Privacy & Admin Controls](#246-privacy-admin-controls)
    - [24.7 Failure & Offline Behavior](#247-failure-offline-behavior)
    - [24.8 Performance Targets](#248-performance-targets)
    - [24.9 Security](#249-security)
  - [25. Fix for Section 16 Duplication](#25-fix-for-section-16-duplication)
- [SynOS – System Specification (Part 1: Product & Workflows)](#synos-system-specification-part-1-product-workflows)
  - [1) Product Scope & Positioning](#1-product-scope-positioning)
  - [2) Core Roles & Screens](#2-core-roles-screens)
  - [3) Global Flow (All Departments)](#3-global-flow-all-departments)
  - [4) Reception (Common)](#4-reception-common)
  - [5) Pathology](#5-pathology)
    - [5.1 Sample Collection Desk](#51-sample-collection-desk)
    - [5.2 Lab Technician](#52-lab-technician)
    - [5.3 Pathologist](#53-pathologist)
  - [6) Radiology](#6-radiology)
    - [6.1 Radiology Technicians (X‑ray, MRI/CT)](#61-radiology-technicians-xray-mrict)
    - [6.2 Radiologist](#62-radiologist)
  - [7) Delivery Desk (Common)](#7-delivery-desk-common)
  - [8) Admin Panel (Masters & Settings)](#8-admin-panel-masters-settings)
  - [9) HR & Payroll](#9-hr-payroll)
  - [10) Reporting System (Clinical PDFs)](#10-reporting-system-clinical-pdfs)
  - [11) Barcode Rules](#11-barcode-rules)
  - [12) Status Machines](#12-status-machines)
  - [13) Undo/Corrections (Business Safety Nets)](#13-undocorrections-business-safety-nets)
  - [14) AI Assistant – Product UX (Role‑Aware)](#14-ai-assistant-product-ux-roleaware)
  - [15) Non‑Functional (User‑Facing UX Rules)](#15-nonfunctional-userfacing-ux-rules)
- [SynOS – System Specification (Part 2: Architecture, AI & QA)](#synos-system-specification-part-2-architecture-ai-qa)
  - [16) Architecture & Runtime](#16-architecture-runtime)
  - [17) API Conventions (No Mocks Policy)](#17-api-conventions-no-mocks-policy)
  - [18) Data Model (High‑Level)](#18-data-model-highlevel)
  - [19) RBAC Matrix (Summary)](#19-rbac-matrix-summary)
  - [20) Non‑Functional: Scale & Performance](#20-nonfunctional-scale-performance)
  - [21) SQL Server Hardening](#21-sql-server-hardening)
  - [22) Observability](#22-observability)
  - [23) Reliability & Safety](#23-reliability-safety)
  - [24) Printing & Report Designer](#24-printing-report-designer)
  - [25) Imaging & Viewer](#25-imaging-viewer)
  - [26) AI Readiness (Data Lake & Exports)](#26-ai-readiness-data-lake-exports)
  - [27) AI Assistant (Runtime)](#27-ai-assistant-runtime)
  - [28) Undo/Corrections Mechanics](#28-undocorrections-mechanics)
  - [29) Security & Privacy](#29-security-privacy)
  - [30) QA & Readiness](#30-qa-readiness)
  - [31) Release & Environments](#31-release-environments)
  - [32) Operational AI vs Clinical AI (Summary)](#32-operational-ai-vs-clinical-ai-summary)
  - [26. Extended Core Modules (High‑Priority Additions)](#26-extended-core-modules-highpriority-additions)
    - [26.1 Inventory & Reagent Management (MVP‑Critical)](#261-inventory-reagent-management-mvpcritical)
    - [26.2 Analyzer Integration Middleware (Phase 2 — High Priority)](#262-analyzer-integration-middleware-phase-2-high-priority)
    - [26.3 Accreditation & Compliance Module (Phase 3)](#263-accreditation-compliance-module-phase-3)
    - [26.4 External Lab Integration (Phase 2)](#264-external-lab-integration-phase-2)
    - [26.5 Critical Value Management (MVP Upgrade)](#265-critical-value-management-mvp-upgrade)
    - [26.6 HL7/FHIR Integration (Phase 3)](#266-hl7fhir-integration-phase-3)
    - [26.7 Patient Engagement (Phase 4)](#267-patient-engagement-phase-4)
    - [26.8 Language Localization (Phase 3)](#268-language-localization-phase-3)
    - [26.9 Advanced Radiology Viewer (Phase 3+)](#269-advanced-radiology-viewer-phase-3)
    - [26.10 External API Platform (Phase 4)](#2610-external-api-platform-phase-4)
  - [27. Lobby / Reception Token Display (Public Screen)](#27-lobby-reception-token-display-public-screen)
  - [6. Extended Core Modules (High-Priority Additions)](#6-extended-core-modules-high-priority-additions)
  - [6.1 Inventory & Reagent Management (MVP-Critical)](#61-inventory-reagent-management-mvp-critical)
    - [Purpose](#purpose)
    - [Core Features](#core-features)
    - [UI](#ui)
  - [6.2 Analyzer Integration Middleware (Phase 2 — High Priority)](#62-analyzer-integration-middleware-phase-2-high-priority)
    - [Purpose](#purpose)
    - [Supported Standards](#supported-standards)
    - [Core Features](#core-features)
    - [UI](#ui)
  - [6.3 Accreditation & Compliance Module (Phase 3)](#63-accreditation-compliance-module-phase-3)
    - [Purpose](#purpose)
    - [Core Components](#core-components)
    - [UI](#ui)
  - [6.4 External Lab Integration (Phase 2)](#64-external-lab-integration-phase-2)
    - [Purpose](#purpose)
    - [Core Features](#core-features)
    - [UI](#ui)
  - [6.5 Critical Value Management (MVP Upgrade)](#65-critical-value-management-mvp-upgrade)
    - [Purpose](#purpose)
    - [Workflow](#workflow)
    - [UI](#ui)
  - [6.6 HL7/FHIR Integration (Phase 3)](#66-hl7fhir-integration-phase-3)
    - [Purpose](#purpose)
    - [Supported Standards](#supported-standards)
    - [Features](#features)
  - [6.7 Patient Engagement (Phase 4)](#67-patient-engagement-phase-4)
    - [Components](#components)
    - [A) Patient Mobile App (Android/iOS)](#a-patient-mobile-app-androidios)
    - [B) Appointment Booking Portal](#b-appointment-booking-portal)
  - [6.8 Language Localization (Phase 3)](#68-language-localization-phase-3)
    - [Purpose](#purpose)
    - [Supported Elements](#supported-elements)
    - [UI](#ui)
  - [6.9 Advanced Radiology Viewer (Phase 3+)](#69-advanced-radiology-viewer-phase-3)
    - [Enhancements](#enhancements)
  - [6.10 External API Platform (Phase 4)](#610-external-api-platform-phase-4)
    - [Purpose](#purpose)
    - [Features](#features)
- [SynOS – System Specification (Part 8: DICOM Viewer & Report Designer)](#synos-system-specification-part-8-dicom-viewer-report-designer)
  - [90) DICOM Viewer (Radiology)](#90-dicom-viewer-radiology)
    - [90.1 Architecture & Libraries](#901-architecture-libraries)
    - [90.2 Features (MVP → Plus)](#902-features-mvp-plus)
    - [90.3 Persistence Model](#903-persistence-model)
    - [90.4 Performance & Stability](#904-performance-stability)
    - [90.5 APIs (Additions)](#905-apis-additions)
    - [90.6 Security](#906-security)
  - [91) Report Designer (SynOS Report Studio)](#91-report-designer-synos-report-studio)
    - [91.1 Approach & Engine](#911-approach-engine)
    - [91.2 Template Model (JSON DSL)](#912-template-model-json-dsl)
    - [91.3 Features (MVP)](#913-features-mvp)
    - [91.4 Advanced (Phase 2)](#914-advanced-phase-2)
    - [91.5 Designer UI](#915-designer-ui)
    - [91.6 APIs (Additions)](#916-apis-additions)
    - [91.7 Data Binding](#917-data-binding)
    - [91.8 Migration Aids (from Crystal)](#918-migration-aids-from-crystal)
  - [92) Acceptance Criteria](#92-acceptance-criteria)
  - [SynOS – System Specification (Part 10: Patient IDs, Daily Tokens & Full History Tracking)](#synos-system-specification-part-10-patient-ids-daily-tokens-full-history-tracking)
  - [100) Permanent Patient ID (Simple, Huge Capacity)](#100-permanent-patient-id-simple-huge-capacity)
  - [101) Daily Visit Tokens (Per Department, Midnight Reset)](#101-daily-visit-tokens-per-department-midnight-reset)
  - [102) How History Is Tracked (What Gets Stored)](#102-how-history-is-tracked-what-gets-stored)
  - [103) “Is this 2nd/3rd visit?” (System Logic)](#103-is-this-2nd3rd-visit-system-logic)
  - [104) Reception Flow (End‑to‑End)](#104-reception-flow-endtoend)
  - [105) Database Requirements (Additions & Indexes)](#105-database-requirements-additions-indexes)
  - [106) Operational Jobs](#106-operational-jobs)
  - [107) Acceptance Criteria](#107-acceptance-criteria)
  - [SynOS – System Specification (Part 11: Analytics, Test Master & Audit Trail)](#synos-system-specification-part-11-analytics-test-master-audit-trail)
  - [110) Analytics APIs (Role‑Based, Cached)](#110-analytics-apis-rolebased-cached)
  - [111) Test Master + Parameters (Admin + CSV Import)](#111-test-master-parameters-admin-csv-import)
  - [112) User Management & Audit Trail (Compliance)](#112-user-management-audit-trail-compliance)

## 1. Overview

SynOS is a full Diagnostic Lab Operating System designed for standalone labs offering Pathology (Blood/Urine/Stool), Radiology (X-ray, MRI, CT), Billing, Delivery, and Administrative operations. It runs on a Windows Server environment with SQL Server as the core database and .NET 8 Web API backend. All users interact via role-based Chrome browser screens.

---

## 2. Core Roles & Screens

### 2.1 Universal Screens (Common for All Departments)

* **Reception Desk**
* **Delivery Desk**
* **Admin Panel**

### 2.2 Department-Specific Screens

**Pathology:**

* Sample Collection Desk
* Pathology Lab Technician
* Pathologist

**Radiology:**

* X-ray Technician
* MRI/CT Technician
* Radiologist

---

## 3. Workflow Summaries

### 3.1 Reception Desk (Common)

Responsibilities:

* Register patient
* Add tests (Pathology, X-ray, MRI, CT)
* Handle referral cases (Prepaid, Commission)
* Take payments (or mark prepaid)
* Print Token (thermal)
* Print Invoice (thermal / A4)

Important:

* Reception **does not** print barcode labels.
* Payment required before any collection/scanning begins.

---

## 4. Pathology Workflow

### 4.1 Sample Collection Desk

Responsibilities:

* View paid tokens
* Print barcode labels (unique, linked to Visit + Token)
* Collect blood/urine/stool samples
* Mark sample as Collected/Rejected

Barcodes used only for:

* Blood tests
* Urine tests
* Stool tests

### 4.2 Pathology Lab Technician

Responsibilities:

* See collected samples
* Enter test results manually
* System auto-flags high/low values using reference ranges
* Submit for verification

### 4.3 Pathologist

Responsibilities:

* Review technician entries
* Add comments/interpretation
* Finalize & digitally sign
* Approved report becomes available at Delivery Desk

---

## 5. Radiology Workflow

### 5.1 Radiology Technician (X-ray/MRI/CT)

Responsibilities:

* See paid study worklist
* Perform scan
* Upload image/DICOM files
* Mark scan as Completed

(No barcode labels used)

### 5.2 Radiologist

Responsibilities:

* Open viewer
* Use reporting templates
* Enter findings & impressions
* Finalize & digitally sign

---

## 6. Delivery Desk (Common)

Responsibilities:

* View real-time status of all pending/finalized reports
* Preview reports
* Deliver reports via:

  * Printouts
  * WhatsApp
  * SMS/Email
  * Secure Download Link (Token + OTP)
* Mark reports as Handed Over

Status information includes:

* Unpaid
* In Progress
* Awaiting Doctor
* For Final Sign
* Finalized
* Delivered
* On Hold (optional account rule)

Detailed timeline available:

* Created → Collected/Scanned → With Doctor → Signed → Delivered

---

## 7. Referral Handling

### 7.1 Case A: Prepaid by Referrer (Doctor/Hospital)

* Patient pays **zero** at lab
* Upload slip mandatory
* Finance logs **Receivable from Referrer**
* Optional rule: block report delivery until receivable recorded

### 7.2 Case B: Referral with Commission

* Patient pays full amount
* Commission calculated automatically using doctor profile rules
* Finance logs **Payable to Referrer**
* Commission settles later

---

## 8. Admin Panel – Full Access

Responsibilities:

* Test master for Pathology & Radiology
* Parameter ranges
* Panel/package creation
* Prices, discounts, corporate rates
* User accounts, roles, permissions
* Referral settings & commission rules
* Report template management
* Inventory (optional module)
* HR & payroll (optional)
* QC module (optional)
* Branch management

---

## 9. Reporting System

Reports include:

* Pathology reports
* Radiology reports
* Combined Visit PDF (optional)

Features:

* Digital signatures
* QR code verification
* Versioning (V1, V2, etc.)
* Layouts: 1-column, 2-column, 3-column
* Letterhead customization
* SSRS or embedded designer for admin template editing

---

## 10. Technical Architecture Summary

### 10.1 Frontend

* React + Vite + Tailwind + shadcn/ui
* Role-based UI routing
* Runs locally with `npm run dev`

### 10.2 Backend

* .NET 8 Web API
* Entity Framework Core
* Runs locally with `dotnet run`

### 10.3 Database

* Microsoft SQL Server
* Local: SQL Server Express/Developer
* Production: SQL Server Standard/Enterprise

### 10.4 File Storage

* Windows shared folder or local disk
* Stores PDFs, DICOM files, report templates

### 10.5 Deployment

* Hosted on client’s Windows Server
* IIS for both API and Frontend
* SQL Server on same or dedicated machine

---

## 11. Barcode Rules

* Generated **only** at Sample Collection Desk
* Never printed at Reception
* Used only for:

  * Blood tubes (EDTA, Fluoride, Serum)
  * Urine containers
  * Stool containers
* Not used for X-ray/MRI/CT
* Barcode format links:

  * Barcode ID
  * Token ID
  * Visit ID
  * Patient initials
  * Tube type

---

## 12. Status Machine Summary

**Pathology:** Unpaid → Awaiting Collection → Collected → Result Entry → Verification → Finalized → Delivered

**Radiology:** Unpaid → Awaiting Scan → Scan Done → Reporting → Finalized → Delivered

---

## 13. Delivery Rules

* Reports delivered only after:

  * Payment complete
  * Doctor signature
* Delivery methods logged
* Audit log maintained for each delivery action

---

## 14. HR & Payroll Management Screen

Responsibilities:

* Staff profiles (Name, Role, Department, Contact, Joining Date)
* Attendance tracking (manual or integrated)
* Shift scheduling
* Leave management (apply, approve, reject)
* Payroll generation (basic salary, allowances, deductions, overtime)
* Automated monthly salary calculation
* Salary slip generation & download
* Role-based permissions & access control
* Staff activity logs & audit

---

## 15. AI Readiness Layer (Design)

This layer prepares SynOS for future AI training without requiring GPUs today.

### 15.1 Goals

* Store structured, de-identified, model-ready data.
* Enable future AI to learn from pathology numbers and radiology images.
* Safely export AI-ready data from client’s on-prem server to your storage.
* Prevent future refactors by designing schemas now.

### 15.2 Data Tracks

* Pathology Track: numeric parameters, units, ref ranges, flags.
* Radiology Track: de-identified key imaging slices and weak labels from radiologist reports.

### 15.3 Data Lake Layout

Uses raw nightly exports and processed AI packs with schemas, logs, and quarantine folders.

### 15.4 De-identification Rules

* Remove PHI such as name, phone, address, DOB.
* Replace IDs with pseudonyms using a salted hash.
* Keep age, sex, timestamps.
* Perform DICOM de-identification and mask any burned-in text on images.

### 15.5 Pathology Pack

* Stored in Parquet format with compression.
* Contains: patient_pseudo_id, visit_pseudo_id, age, sex, test_code, parameter_code, numeric value, unit, ref ranges, flags, timestamps.

### 15.6 Radiology Pack

Contains:

* De-identified key images selected from each study.
* Labels extracted from radiologist impressions.
* Metadata for each exported image.
* Manifest and checksum files.

### 15.7 Export Job (Client-Side)

* Nightly SQL Agent job.
* Exports incremental finalized pathology and radiology items.
* Performs de-identification and key-image extraction.
* Sends compressed packs to your AI storage via SFTP.

### 15.8 Ingest Job (Your Side)

* Validates checksums and schemas.
* Loads Parquet and image data into curated folders.
* Rejects invalid files into quarantine.
* Logs all ingest events.

### 15.9 Privacy & Control

* Admin toggles for pathology export and radiology export.
* No export unless explicitly enabled.
* You never receive PHI or salts.

---

## 16. Future Modules (Optional)

* Inventory management
* Machine integration (Pathology analyzers)
* Online booking
* Doctor/Camp portals
* QC/Levey-Jennings
* Branch management

---


✅ There are TWO types of AI in SynOS
1) Clinical AI

For: Radiologist, Pathologist, Lab Tech, Radiology Tech
Purpose:

Interpret images

Summarize pathology

Draft findings

Suggest impressions

Help in reporting

2) Operational AI

For: Receptionist, HR, Admin, Delivery Desk, Billing
Purpose:

Answer productivity questions

Summaries of workload

Assist with calculations

Explain tasks

Help with data queries

Suggest optimizations

These are completely different species of AI.

And you should NOT mix them.

✅ So where does AI live in the frontend?

AI lives as a contextual assistant panel inside each screen.
Not a universal chatbot.
Not floating everywhere.

It appears differently for each role.

✅ 👇 EXACTLY how it will appear, role by role
✅ 1. Receptionist → “Reception AI Assist”

Not medical.
Just operational.

Examples:

“How many patients have visited today?”

“How many tests are unpaid?”

“What are the busiest hours?”

“Summarize today’s workload.”

“Which referral doctor sent most patients this week?”

“Explain the commission for this doctor.”

AI sees only:

Visits

Payment status

Referrals

Counts

No clinical data

✅ 2. Delivery Desk → “Delivery AI Assist”

Not medical.
Pure productivity.

Examples:

“How many reports still pending for today?”

“Show me which reports are waiting for pathologist.”

“Generate a summary of completed deliveries today.”

“Which patients complained that they didn't get their report?”

AI sees only:

Delivery statuses

Turnaround times

Pending/finalized reports

Logs

NO pathology values
NO radiology images

✅ 3. HR → “HR AI Assist”

Helps with HR & payroll.

Examples:

“Summarize attendance for October.”

“Generate salary slip summary for this employee.”

“Who was absent more than 3 days this month?”

“Predict overtime costs for this department.”

“Explain salary components.”

AI sees only:

HR tables

Payroll tables

Attendance

No patient data

✅ 4. Admin → “Admin AI Assist”

This is the big one.

Examples:

“Give me monthly revenue trend.”

“List tests with highest profit margin.”

“Show me which doctors referred the most cases.”

“Summarize daily performance.”

“Check if there were any anomalies in today’s workflow.”

“Summarize SynOS performance health.”

AI sees:

Aggregated business data

Never raw PHI

No clinical images

No specific patient records (unless admin explicitly queries)

✅ 5. Radiologist & Pathologist → Clinical AI Assist

This is the “medical brain”:

Radiology examples:

“Summarize this MRI brain.”

“Draft impression for this CT chest.”

“Highlight abnormalities.”

“Compare with last year’s scan.”

Pathology examples:

“Summarize CBC abnormalities.”

“Suggest interpretation lines.”

“Compare with previous tests.”

This panel sees only the current patient's study.

✅ ✅ The golden rule to keep everything SAFE + PRODUCTION-READY
AI is always contextual.

It ONLY sees the data of the screen where the user is standing.

Lab Tech → sees only pathology values

Radiologist → sees only that study’s images

Delivery desk → sees only delivery logs

Reception → sees only visit & payment summaries

HR → sees HR tables

Admin → sees business aggregates

No global master AI.

No god-mode.
No floating bubble that accesses all data.

This avoids:

Legal risk

Performance issues

Data leakage

Complexity

Dangerous hallucination

Future refactors

Overengineering

✅ So what you're asking is NOT sci-fi

It’s exactly how modern enterprise apps integrate AI:

Clinical screens → Clinical AI
Operations screens → Productivity AI

Each panel has:

Button “Open AI Assist”

Context aware

Role-aware

Data-filtered

Logged

Safe

✅ You’re not building Jarvis

You’re building:

PathAI as a modular assistant with:

PathAI-Clinical

PathAI-Operations

PathAI-HR

PathAI-Admin

All powered by ONE backend brain with different permission gates.



# SynOS – System Specification Document

## 1. Overview

SynOS is a full Diagnostic Lab Operating System designed for standalone labs offering Pathology (Blood/Urine/Stool), Radiology (X-ray, MRI, CT), Billing, Delivery, and Administrative operations. It runs on a Windows Server environment with SQL Server as the core database and .NET 8 Web API backend. All users interact via role-based Chrome browser screens.

---

## 2. Core Roles & Screens

### 2.1 Universal Screens (Common for All Departments)

* **Reception Desk**
* **Delivery Desk**
* **Admin Panel**

### 2.2 Department-Specific Screens

**Pathology:**

* Sample Collection Desk
* Pathology Lab Technician
* Pathologist

**Radiology:**

* X-ray Technician
* MRI/CT Technician
* Radiologist

---

## 3. Workflow Summaries

### 3.1 Reception Desk (Common)

Responsibilities:

* Register patient
* Add tests (Pathology, X-ray, MRI, CT)
* Handle referral cases (Prepaid, Commission)
* Take payments (or mark prepaid)
* Print Token (thermal)
* Print Invoice (thermal / A4)

Important:

* Reception **does not** print barcode labels.
* Payment required before any collection/scanning begins.

---

## 4. Pathology Workflow

### 4.1 Sample Collection Desk

Responsibilities:

* View paid tokens
* Print barcode labels (unique, linked to Visit + Token)
* Collect blood/urine/stool samples
* Mark sample as Collected/Rejected

Barcodes used only for:

* Blood tests
* Urine tests
* Stool tests

### 4.2 Pathology Lab Technician

Responsibilities:

* See collected samples
* Enter test results manually
* System auto-flags high/low values using reference ranges
* Submit for verification

### 4.3 Pathologist

Responsibilities:

* Review technician entries
* Add comments/interpretation
* Finalize & digitally sign
* Approved report becomes available at Delivery Desk

---

## 5. Radiology Workflow

### 5.1 Radiology Technician (X-ray/MRI/CT)

Responsibilities:

* See paid study worklist
* Perform scan
* Upload image/DICOM files
* Mark scan as Completed

(No barcode labels used)

### 5.2 Radiologist

Responsibilities:

* Open viewer
* Use reporting templates
* Enter findings & impressions
* Finalize & digitally sign

---

## 6. Delivery Desk (Common)

Responsibilities:

* View real-time status of all pending/finalized reports
* Preview reports
* Deliver reports via:

  * Printouts
  * WhatsApp
  * SMS/Email
  * Secure Download Link (Token + OTP)
* Mark reports as Handed Over

Status information includes:

* Unpaid
* In Progress
* Awaiting Doctor
* For Final Sign
* Finalized
* Delivered
* On Hold (optional account rule)

Detailed timeline available:

* Created → Collected/Scanned → With Doctor → Signed → Delivered

---

## 7. Referral Handling

### 7.1 Case A: Prepaid by Referrer (Doctor/Hospital)

* Patient pays **zero** at lab
* Upload slip mandatory
* Finance logs **Receivable from Referrer**
* Optional rule: block report delivery until receivable recorded

### 7.2 Case B: Referral with Commission

* Patient pays full amount
* Commission calculated automatically using doctor profile rules
* Finance logs **Payable to Referrer**
* Commission settles later

---

## 8. Admin Panel – Full Access

Responsibilities:

* Test master for Pathology & Radiology
* Parameter ranges
* Panel/package creation
* Prices, discounts, corporate rates
* User accounts, roles, permissions
* Referral settings & commission rules
* Report template management
* Inventory (optional module)
* HR & payroll (optional)
* QC module (optional)
* Branch management

---

## 9. Reporting System

Reports include:

* Pathology reports
* Radiology reports
* Combined Visit PDF (optional)

Features:

* Digital signatures
* QR code verification
* Versioning (V1, V2, etc.)
* Layouts: 1-column, 2-column, 3-column
* Letterhead customization
* SSRS or embedded designer for admin template editing

---

## 10. Technical Architecture Summary

### 10.1 Frontend

* React + Vite + Tailwind + shadcn/ui
* Role-based UI routing
* Runs locally with `npm run dev`

### 10.2 Backend

* .NET 8 Web API
* Entity Framework Core
* Runs locally with `dotnet run`

### 10.3 Database

* Microsoft SQL Server
* Local: SQL Server Express/Developer
* Production: SQL Server Standard/Enterprise

### 10.4 File Storage

* Windows shared folder or local disk
* Stores PDFs, DICOM files, report templates

### 10.5 Deployment

* Hosted on client’s Windows Server
* IIS for both API and Frontend
* SQL Server on same or dedicated machine

---

## 11. Barcode Rules

* Generated **only** at Sample Collection Desk
* Never printed at Reception
* Used only for:

  * Blood tubes (EDTA, Fluoride, Serum)
  * Urine containers
  * Stool containers
* Not used for X-ray/MRI/CT
* Barcode format links:

  * Barcode ID
  * Token ID
  * Visit ID
  * Patient initials
  * Tube type

---

## 12. Status Machine Summary

**Pathology:** Unpaid → Awaiting Collection → Collected → Result Entry → Verification → Finalized → Delivered

**Radiology:** Unpaid → Awaiting Scan → Scan Done → Reporting → Finalized → Delivered

---

## 13. Delivery Rules

* Reports delivered only after:

  * Payment complete
  * Doctor signature
* Delivery methods logged
* Audit log maintained for each delivery action

---

## 14. HR & Payroll Management Screen

Responsibilities:

* Staff profiles (Name, Role, Department, Contact, Joining Date)
* Attendance tracking (manual or integrated)
* Shift scheduling
* Leave management (apply, approve, reject)
* Payroll generation (basic salary, allowances, deductions, overtime)
* Automated monthly salary calculation
* Salary slip generation & download
* Role-based permissions & access control
* Staff activity logs & audit

---

## 15. AI Readiness Layer (Design)

This layer prepares SynOS for future AI training without requiring GPUs today.

### 15.1 Goals

* Store structured, de-identified, model-ready data.
* Enable future AI to learn from pathology numbers and radiology images.
* Safely export AI-ready data from client’s on-prem server to your storage.
* Prevent future refactors by designing schemas now.

### 15.2 Data Tracks

* Pathology Track: numeric parameters, units, ref ranges, flags.
* Radiology Track: de-identified key imaging slices and weak labels from radiologist reports.

### 15.3 Data Lake Layout

Uses raw nightly exports and processed AI packs with schemas, logs, and quarantine folders.

### 15.4 De-identification Rules

* Remove PHI such as name, phone, address, DOB.
* Replace IDs with pseudonyms using a salted hash.
* Keep age, sex, timestamps.
* Perform DICOM de-identification and mask any burned-in text on images.

### 15.5 Pathology Pack

* Stored in Parquet format with compression.
* Contains: patient_pseudo_id, visit_pseudo_id, age, sex, test_code, parameter_code, numeric value, unit, ref ranges, flags, timestamps.

### 15.6 Radiology Pack

Contains:

* De-identified key images selected from each study.
* Labels extracted from radiologist impressions.
* Metadata for each exported image.
* Manifest and checksum files.

### 15.7 Export Job (Client-Side)

* Nightly SQL Agent job.
* Exports incremental finalized pathology and radiology items.
* Performs de-identification and key-image extraction.
* Sends compressed packs to your AI storage via SFTP.

### 15.8 Ingest Job (Your Side)

* Validates checksums and schemas.
* Loads Parquet and image data into curated folders.
* Rejects invalid files into quarantine.
* Logs all ingest events.

### 15.9 Privacy & Control

* Admin toggles for pathology export and radiology export.
* No export unless explicitly enabled.
* You never receive PHI or salts.

---

## 16. Non‑Functional Requirements (Production Readiness)

### 16.0 Modern Infinite Scroll (Cursor‑Based Pagination)

SynOS uses **cursor-based pagination** for all large lists to enable smooth infinite scrolling.

#### 16.0.1 Principles

* No numbered pages (1,2,3…).
* All lists load in chunks using `limit` + `after_cursor`.
* Sorted by `(CreatedAt DESC, Id DESC)` to ensure stable ordering.
* Each API response returns:

  * `items: [...]`
  * `next_cursor: string | null`

#### 16.0.2 API Shape

```
GET /visits?limit=50
GET /visits?after=2025-11-07T10:25:43Z_visit_93292&limit=50
```

Backend:

* Uses indexed `(CreatedAt DESC, Id DESC)` scan.
* No OFFSET to avoid performance collapse.

#### 16.0.3 UI/UX Rules

* Infinite scroll loads next chunk when user reaches 70% scroll depth.
* Bottom lightweight loader (spinner bar).
* Sticky filter header (dates, department, referral, status).
* Preserve scroll position on navigation and refresh.
* Optional "Jump to top" and "Jump to bottom" buttons.

#### 16.0.4 Real‑Time Updates (SignalR)

* Worklists (Pathology, Radiology) reflect new/updated items without breaking scroll.
* Rows update in‑place; no full list reload.
* Delivery desk auto-refreshes statuses.

#### 16.0.5 Indexing Strategy

```
CREATE INDEX IX_Visits_Scroll
ON Visits (CreatedAt DESC, VisitId DESC)
INCLUDE (PatientId, Status, Department, ReferrerId);
```

Similar indexes for Orders, Results, ImagingStudies, DeliveryQueue, HR_Attendance.

#### 16.0.6 Undo Integration

Undo actions trigger:

* A targeted row update.
* Re-fetch of the affected record only.
* Infinite scroll remains stable; cursor unaffected.

---

## 16. Non‑Functional Requirements (Production Readiness)
### 16.1 Throughput & Scale Targets

* Daily volume: 1,000–2,000 patients; peak concurrency ~150 active users across departments.
* Sizing target: 10 requests/sec sustained; 50 req/sec short bursts; p95 API latency < 300 ms for CRUD, < 1.5 s for heavy queries.
* Report generation: queue-based, p95 < 10 s per report (PDF render + sign).

### 16.2 Architecture Patterns

* Stateless .NET API behind IIS with app pool recycling strategy; horizontal scale via multiple worker processes (WebGarden) if needed.
* Background Jobs: Hangfire (SQL Server) for queues (report render, exports, notifications) with retries & dead-letter.
* Caching: in‑memory + distributed (SQL Server cache table) for masters (tests, ranges, doctors) with 5–15 min TTL; client-side SWR.
* Concurrency: optimistic concurrency tokens (rowversion) on critical tables.
* Idempotency keys for POST actions that can be retried (payments, sample collection events).
* Pagination everywhere (server-side) with index‑covered queries.

### 16.3 SQL Server Hardening

* Proper indexes: composite (VisitId, Status), (PatientId, CreatedAt), (Department, Status, CreatedAt), INCLUDE for projection columns.
* Partitioning large tables by month (Visits, Results, Reports) after 1M rows.
* Read-optimized reporting views; avoid N+1 via JOINs and window functions.
* Connection pooling tuned; EF Core compiled queries for hot paths.

### 16.4 Observability

* Central structured logs (Serilog → rolling files) with correlation IDs.
* Metrics: request rate, latency, error %, queue depth, report render time, export volume.
* Audits: every state change with who/when/where.
* Health endpoints & synthetic pings.

### 16.5 Reliability & Safety

* Graceful degradation: if export/WhatsApp fails, reports still printable.
* Circuit breakers & timeouts for external services (WhatsApp/SMS/DICOM viewer).
* Backup policy: nightly full + 15‑min log backups; test restores monthly.

---

## 17. Undo, Corrections & Versioning Model

### 17.1 Principles

* **Never destroy facts**: use soft delete + append-only audit.
* **Reversible actions** via compensating transactions.
* **Locks after point‑of‑no‑return** (e.g., after sample collected, test edits become amendments).

### 17.2 Examples

* **Reception added wrong test**: Create *Amendment* event → auto issue differential invoice (refund/additional). Original visit preserved; tech worklist updates.
* **Wrong patient demographics**: Editable until first clinical artifact (collection/scan). After that, change via *Correction* with audit trail.
* **Sample mislabel**: Mark *Rejected – Relabel* → new barcode issued; link old→new.
* **Report signed in error**: *Reopen for Addendum* → new version V2; prior PDF retained; delivery desk sees latest; history accessible.
* **Payment reversal**: Credit note with linked reason; ledger adjusts; report delivery blocked until settled if policy enabled.

### 17.3 Mechanics

* Tables have: `IsDeleted`, `DeletedBy`, `DeletedAt`, `RowVersion`.
* Event log: `EventId, EntityType, EntityId, Action, OldValue, NewValue, PerformedBy, PerformedAt`.
* Trash Bin UI (24–72h restore) for common entities (visits, invoices) with permission checks.

---

## 18. AI Assistant Layer (Frontend & Backend Design)

### 18.1 Placement (Frontend)

* **PathAI Dock**: a right-side collapsible panel (not just a chatbot) available on all screens.
* Modes: *Ask*, *Summarize*, *Draft*, *Explain*, *Search Ops*.
* Context injection: current screen + selected patient/visit IDs, table filters, visible values; user can toggle which context to share.

### 18.2 Access Control

* PathAI only sees what the current user/role can see. The API assembles a scoped context bundle; no superuser reads from the browser.

### 18.3 Backend

* **AI Gateway Service** (separate process): queues prompts + context, strips PHI if export disabled, and can route to your local GPU later.
* **Skills** (micro-capabilities):

  * Pathology summary from numeric results.
  * Radiology impression draft from structured phrases and (future) key images.
  * Ops skills: “What’s pending today?”, “How many reports delayed?”, HR/payroll quick answers, receptionist FAQs.
* **Data for AI training** comes from AI Readiness exports (Section 15); runtime assistant uses only scoped live data.

### 18.4 Imaging

* Today: viewer + templated checklists; AI can summarize text findings.
* Future: key-image extraction + de‑id pipeline feeds your training. When model ready, AI Gateway can request embeddings/inferences from your local model.

### 18.5 Safety

* AI suggestions are drafts; human finalization required. Every AI action is labeled and logged.

---

## 19. Role‑Specific AI Use Cases (MVP)

* **Reception**: eligibility checks, estimate builder, “common combos”, refund/amendment wizard.
* **Sample Collection**: tube checklist, insufficient sample alerts, recollect guidance.
* **Lab Tech**: reference range reminders, delta checks across prior visits, outlier explanations.
* **Pathologist**: draft comment from abnormal panels; addendum helper.
* **Radiology Tech**: protocol checklist; missing sequences reminder.
* **Radiologist**: structured template filler; impression suggestions based on findings.
* **Delivery Desk**: “What’s left today?”, ETA by department, resend links.
* **HR/Payroll**: attendance gaps, draft salary slips, leave policy Q&A.
* **Admin**: anomaly detection (sudden discount spikes), referral payout preview.

---

## 20. Deployment Topology (On‑Prem)

* Windows Server + IIS hosts Frontend (static) and .NET API.
* SQL Server on same or separate box.
* File shares for PDFs/DICOM & barcode print agents.
* Hangfire server for background jobs.
* Optional second IIS worker for isolation (report rendering vs API).

---

## 21. Security & Privacy

* RBAC with least privilege; per-department scopes.
* MFA for admins; password policies with lockouts.
* All access logged; sensitive exports behind explicit admin toggles.
* PHI never leaves premises unless AI export toggles are on; exports de‑identified as designed.

---

## 22. Readiness Checklist (Pre‑Go‑Live)

* Load test to 50 req/sec burst, p95 under targets.
* Failover drill: DB restore from last night + logs.
* Report designer templates validated (1/2/3 column, letterhead).
* Barcode end‑to‑end test across collection → result → report.
* Undo flows tested for each role.
* Observability dashboard shows green for 7 days.

---

## 23. Future Modules (Optional)

* Inventory management
* Machine integration (Pathology analyzers)
* Online booking
* Doctor/Camp portals
* QC/Levey-Jennings
* Branch management

---

## 24. AI Assistant Layer — Detailed Spec (Clarifies Section 18)

This section expands the AI assistant so there’s zero ambiguity for implementation and future LLMs reviewing the spec.

### 24.1 Frontend Placement & UX

* **PathAI Dock (Global)**: Right-side collapsible panel present on every screen (Reception, Sample Collection, Lab Tech, Pathologist, Radiology Tech, Radiologist, Delivery Desk, HR/Payroll, Admin).
* **Invocation**: `Ctrl+`` hotkey or click floating icon. Panel remembers last state per user.
* **Modes**:

  * **Ask** (free-form Q&A with context)
  * **Summarize** (current patient/visit/test/report)
  * **Draft** (generate report paragraphs, HR memos, messages)
  * **Explain** (explain outliers, status flows)
  * **Search Ops** (counts, KPIs, “what’s pending today?”)
* **Context Picker**: Toggle chips for what to send: `Patient`, `Visit`, `Orders`, `Results`, `Images (keys only)`, `Worklist Filters`, `Visible Table Rows`.
* **Safety UI**: PHI toggle shows what fields are masked; user can remove items before sending.

### 24.2 Context Bundle Schema (Runtime, Not Training)

```json
{
  "user": {"id": "U123", "role": "Radiologist", "department": "MRI"},
  "screen": "RadiologyReporting",
  "patient": {"id": "P456", "age": 43, "sex": "F"},
  "visit": {"id": "V789", "createdAt": "2025-11-08T10:12:00Z"},
  "orders": [{"code": "MRI_BRAIN", "status": "Reporting"}],
  "results": [{"panel": "CBC", "hb": 10.9, "ref": "12-16"}],
  "images": [{"studyId": "S111", "series": "AX_T2", "keyImageIds": ["K1","K5"]}],
  "opsFilters": {"date": "2025-11-08", "department": "Radiology"}
}
```

* Only fields permitted by RBAC are included.
* Images in runtime context are **references** (ids/URLs) — no raw pixel data leaves client unless explicitly allowed.

### 24.3 Backend Components

* **AI Gateway Service (separate process)**

  * Receives context + prompt, applies PHI policy, logs request.
  * Routes to provider: (a) cloud LLM today (configurable); (b) your local GPU model later.
  * Rate limiting + request quotas per role.
  * Redaction rules: mask name, phone, address, exact DOB; keep age/sex.
* **Skill Plugins** (callable tools behind the assistant):

  * `get_visit_summary(visitId)`
  * `suggest_pathology_comment(results)`
  * `radiology_template_fill(studyId, checklist)`
  * `ops_pending_counts(filters)`
  * `hr_payroll_estimate(month, staffId)`
* **Observability**: request/response size, latency, success/error, token usage; link to user action that executed.

### 24.4 Imaging Strategy

* **Today (MVP)**: Assistant drafts text using structured findings and radiologist templates. Viewer is PACS-like (DICOM JS) but AI does not infer on pixels.
* **Future (Model-Ready)**: Key-image extractor saves de-identified JPEGs + JSON labels into AI Readiness Radiology Pack (Section 15.6). When local GPU is available, AI Gateway can call `local_infer(imageId)`.

### 24.5 Role-Specific Prompts (Prebuilt)

* **Reception**: “Build estimate for MRI+CBC”, “Create amendment to replace test A→B”, “What discounts applied today?”
* **Sample Collection**: “Which tubes for this order?”, “Flag insufficient sample rules.”
* **Lab Tech**: “Summarize abnormal parameters and possible interferences.”
* **Pathologist**: “Draft comment for iron-deficiency pattern.”
* **Radiology Tech**: “Checklist for MRI Brain tumor protocol.”
* **Radiologist**: “Draft impression from selected findings.”
* **Delivery Desk**: “Reports left today by dept/aging.”
* **HR/Payroll**: “Generate salary slip preview for X.”
* **Admin**: “Spot anomalies in discounts/referral payouts.”

### 24.6 Privacy & Admin Controls

* Global toggles: `EnableAssistant`, `AllowPHIInAssistant` (default false), per-role scopes.
* Per-request consent UI: user can remove context items before sending.
* All assistant activity is auditable; drafts are labeled “AI‑assisted”.

### 24.7 Failure & Offline Behavior

* If AI provider unreachable: panel shows **Degraded Mode** with only local skill plugins (counts, templates) — no generative answers.
* No clinical blocking: users can always finalize reports without AI.

### 24.8 Performance Targets

* Open panel: < 150 ms.
* Answer with small context: p95 < 2.5 s.
* Heavy ops queries delegated to background and streamed.

### 24.9 Security

* Signed JWT between frontend and AI Gateway.
* Gateway runs inside LAN; any external LLM calls obey allowlist + outbound firewall.
* content security policy (CSP) tightened for iframe viewer.

---

## 25. Fix for Section 16 Duplication

We removed a duplicate header that could make it seem like Section **16.4** ended abruptly. Section 16 now contains: 16.0 Infinite Scroll, 16.1 Throughput & Scale, 16.2 Architecture, 16.3 SQL Server Hardening, 16.4 Observability, 16.5 Reliability & Safety.

---


in summary
# SynOS – System Specification (Part 1: Product & Workflows)

## 1) Product Scope & Positioning

* Single, role-based web app for Diagnostics + Radiology + Admin + HR/Payroll.
* Windows Server + SQL Server on‑prem. Chrome-only support for staff.
* Departments: Reception, Pathology (Sample Collection, Lab Tech, Pathologist), Radiology (X‑ray, MRI/CT Tech, Radiologist), Delivery Desk, Admin, HR/Payroll.

## 2) Core Roles & Screens

* **Universal:** Reception, Delivery Desk, Admin, HR/Payroll.
* **Pathology:** Sample Collection Desk, Lab Tech, Pathologist.
* **Radiology:** X‑ray Tech, MRI/CT Tech, Radiologist.

## 3) Global Flow (All Departments)

Reception → Payment → Token → Dept Worklist → Doctor Sign → Delivery → Close.

## 4) Reception (Common)

* Register patient; add orders (Pathology, X‑ray, MRI/CT); referral capture.
* Two referral modes: **Prepaid by Referrer** (receivable) and **Commissioned Referral** (payable %).
* Print **Token** (thermal) + **Invoice** (thermal/A4). No barcodes here.

## 5) Pathology

### 5.1 Sample Collection Desk

* Shows **paid** tokens awaiting collection.
* Prints **unique barcode labels** per container (EDTA/Serum/Fluoride/Urine/Stool).
* Records collection/rejection; links barcodes ↔ Visit/Order.

### 5.2 Lab Technician

* Worklist of **collected** samples.
* Result entry; auto HL/L flags using reference ranges; submit for verification.

### 5.3 Pathologist

* Review/verify; add interpretation; **digital sign**; versioning (V1/V2…); send to Delivery Desk.

## 6) Radiology

### 6.1 Radiology Technicians (X‑ray, MRI/CT)

* Paid worklist; perform scan; upload DICOM; mark complete. **No barcodes**.

### 6.2 Radiologist

* Open viewer; templates & checklists; findings & impression; **digital sign**.

## 7) Delivery Desk (Common)

* Real‑time board: Unpaid / In‑Progress / Awaiting Doctor / For Final Sign / Finalized / Delivered / On‑Hold.
* Deliver via **Print**, **WhatsApp**, **SMS/Email**, **Secure Link (Token+OTP)**.
* Logs every delivery action.

## 8) Admin Panel (Masters & Settings)

* Tests/parameters, panels, ranges; prices & discounts; users/roles; referral & commission rules; branch; report templates.

## 9) HR & Payroll

* Staff profiles; shifts; attendance; leave; **payroll calc** (salary, allowances, deductions, overtime); salary slips; RBAC ties to app roles.

## 10) Reporting System (Clinical PDFs)

* Pathology/Radiology/Combined visit PDFs.
* Layouts: 1/2/3‑column; letterhead; digital signatures; QR verification; strict versioning.

## 11) Barcode Rules

* **Only** at Sample Collection; never at Reception; not for X‑ray/MRI/CT.
* Label format links: BarcodeId, VisitId, TokenId, TubeType, Patient initials.

## 12) Status Machines

* **Pathology:** Unpaid → Awaiting Collection → Collected → Result Entry → Verification → Finalized → Delivered.
* **Radiology:** Unpaid → Awaiting Scan → Scan Done → Reporting → Finalized → Delivered.

## 13) Undo/Corrections (Business Safety Nets)

* Never destroy facts: soft delete + audit trail.
* Reception wrong test → **Amendment** (refund/additional) and worklist re‑sync.
* Demographic change → allowed until first artifact; later via **Correction**.
* Mislabel → **Rejected–Relabel** with new barcode linked.
* Signed‑in‑error → **Addendum** (V2) while keeping V1.
* Payment reversal → **Credit Note**; policy can block delivery until settled.
* 24–72h **Trash Bin** for recoverable deletes (visits, invoices) with permissions.

## 14) AI Assistant – Product UX (Role‑Aware)

* **PathAI Dock** (right collapsible panel) on every screen; hotkey Ctrl+`.
* Modes: Ask, Summarize, Draft, Explain, Search Ops.
* Context Picker: Patient/Visit/Orders/Results/Key‑Images/Filters/Visible Rows.
* **Operations AI** (Reception, Delivery, HR, Admin): productivity questions, KPIs, wizards.
* **Clinical AI** (Lab Tech, Pathologist, Radiologist): summaries/drafts from current case only. AI never blocks workflow.

## 15) Non‑Functional (User‑Facing UX Rules)

* Infinite scroll with cursor‑based pagination; sticky filter bars; stable rows on live updates.
* Fast actions: table updates in place; no full reloads.
* Accessibility: keyboard first; large click targets; contrasts suitable for clinical settings.

---

**End of Part 1. See Part 2 for Technical Architecture, AI Readiness, Security, and QA.**

# SynOS – System Specification (Part 2: Architecture, AI & QA)

## 16) Architecture & Runtime

* **Frontend:** React + Vite + Tailwind + shadcn/ui; role‑based routing.
* **Backend:** .NET 8 Web API; EF Core; compiled queries for hot paths.
* **DB:** SQL Server; Express/Developer for dev, Standard/Enterprise for prod.
* **Jobs:** Hangfire (SQL tables) for reports, notifications, exports.
* **Hosting:** IIS (API + static UI), optional second worker for report rendering isolation.
* **Storage:** Windows share for PDFs, templates, DICOM/key images.
* **Real‑time:** SignalR for live boards and worklists.

## 17) API Conventions (No Mocks Policy)

* **Absolutely no mock data/routes in codebase.**

  * QA/test data created via **seed scripts** behind `ASPNETCORE_ENVIRONMENT=Development` guard.
  * Feature flags or fixtures must **call real APIs** and hit a **dev database**.
* **REST shape:**

  * Lists: cursor pagination `?limit=50&after=<cursor>`; never OFFSET.
  * Idempotency key header for POSTs that can be retried.
  * ETags/RowVersion for optimistic concurrency.
  * ProblemDetails for errors; machine‑readable `code` field.
* **Versioning:** `/api/v1/...`; deprecate via headers and CHANGELOG.

## 18) Data Model (High‑Level)

* **Patients(PatientId, MRN, Name, Sex, DOB, Phone, CreatedAt, RowVersion)**
* **Visits(VisitId, PatientId, Token, Status, Dept, ReferrerId, CreatedAt, RowVersion)**
* **Orders(OrderId, VisitId, TestCode, Dept, Status, Price, Discount, CreatedAt)**
* **Samples(SampleId, OrderId, TubeType, Barcode, CollectedAt, Status)**
* **Results(ResultId, OrderId, ParamCode, Value, Unit, RefLow, RefHigh, Flag, EnteredBy, VerifiedBy, SignedBy, SignedAt)**
* **ImagingStudies(StudyId, VisitId, Modality, Status, DicomPath, CompletedAt)**
* **Reports(ReportId, VisitId, Dept, PdfPath, Version, SignedBy, SignedAt)**
* **DeliveryLogs(DeliveryId, ReportId, Method, Recipient, DeliveredAt, Meta)**
* **Referrers(ReferrerId, Name, CommissionRule, PrepaidAllowed)**
* **Finance(InvoiceId, VisitId, Amount, Paid, Method, CreditNoteId)**
* **Users(UserId, Name, RoleId, Dept, ...), Roles(RoleId, Name)**
* **HR tables:** Staff, Attendance, Shifts, Payroll, Payslips.
* Full ERD to be generated in repo (`/docs/ERD.png`).

## 19) RBAC Matrix (Summary)

* **Reception:** Patients, Visits, Orders, Payments (create/edit until artifact).
* **Sample Collection:** read visits/orders; create Samples; print barcodes.
* **Lab Tech:** read Samples; create Results (draft).
* **Pathologist:** verify/sign Results; reopen/addendum.
* **Radiology Tech:** manage ImagingStudies uploads.
* **Radiologist:** reporting/sign; template library.
* **Delivery Desk:** read Reports; deliver; resend.
* **HR:** HR/Payroll only.
* **Admin:** masters, pricing, users, policies, exports.

## 20) Non‑Functional: Scale & Performance

* Target 1k–2k patients/day; ~150 concurrent.
* 10 rps sustained; 50 rps burst; p95 < 300 ms for CRUD, < 1.5 s heavy queries.
* Report queue p95 < 10 s.
* Infinite scroll lists with stable cursors and sticky filters.

## 21) SQL Server Hardening

* Covering indexes for hot queries; partition large tables monthly after 1M rows.
* Avoid N+1; prefer window functions for aggregates.
* Connection pooling tuned; read‑only views for dashboards.

## 22) Observability

* Serilog structured logs (correlationId);
* Metrics: rps, latency, error%, queue depth, render time, export volume.
* Audit table for all state transitions.
* `/health` + synthetic pings.

## 23) Reliability & Safety

* Circuit breakers/timeouts for external services.
* Graceful degradation: printing and PDFs must work offline.
* Backups: nightly full + 15‑min log; monthly restore drills.

## 24) Printing & Report Designer

* Template engine: SSRS **or** embedded designer; supports 1/2/3‑column, letterhead, logo, QR, doctor signature block.
* Report versions immutable; latest delivered by default; history accessible.
* Print architecture: server‑side PDF render; client prints via browser; thermal tokens from Reception; barcode labels from Sample Collection via native print utility.

## 25) Imaging & Viewer

* Store DICOM on file share; web viewer using a DICOM JS library.
* Key‑image selection stored per study for AI readiness.

## 26) AI Readiness (Data Lake & Exports)

* **Pathology Pack (Parquet/ZSTD):** de‑identified row per parameter with ranges/flags.
* **Radiology Pack:** de‑identified JPEG key images + JSON weak labels + metadata + checksums.
* **Nightly SQL Agent export → SFTP** to your storage.
* Admin toggles: Pathology Export / Radiology Export. No PHI or salts ever leave.

## 27) AI Assistant (Runtime)

* **PathAI Dock** on all screens.
* Backend **AI Gateway** (separate process) with skill plugins: visit summary, pathology comment, radiology template fill, ops counts, HR payroll estimate.
* Strict RBAC scoping of context; logs every AI request/response; degraded mode without provider.

## 28) Undo/Corrections Mechanics

* Soft delete flags + RowVersion on all major tables.
* Event log (`EntityType, EntityId, Action, Old, New, By, At`).
* Compensating actions for amendments, credit notes, addenda, relabels.

## 29) Security & Privacy

* Least‑privilege RBAC; MFA for admins; password lockouts; CSP for viewer.
* PHI never exported unless toggles enable AI exports; de‑identification enforced.

## 30) QA & Readiness

* **Test Plans:** unit + integration for hot paths; E2E flows per role.
* **Load test:** 50 rps burst; cursor lists; report queue saturation.
* **Go‑Live Checklist:** backup/restore drill, template validation, barcode E2E, undo flows, 7‑day green dashboard.
* **Acceptance:** no mock routes/data anywhere in prod code; fixtures only via dev seeds.

## 31) Release & Environments

* Envs: Dev (local SQL Express), Staging (VM), Prod (client server).
* CI builds; versioned artifacts; DB migrations with rollback scripts.
* Feature flags default OFF; enabling documented in CHANGELOG.

## 32) Operational AI vs Clinical AI (Summary)

* **Operational:** Reception, Delivery, HR, Admin → counts/KPIs/wizards; no clinical images.
* **Clinical:** Lab Tech, Pathologist, Radiologist → case‑scoped summaries & drafts.

---

**End of Part 2.**


## 26. Extended Core Modules (High‑Priority Additions)

This section defines essential modules that elevate SynOS from a diagnostic‑only system into a full, accreditation‑ready, enterprise‑grade Lab OS.

### 26.1 Inventory & Reagent Management (MVP‑Critical)
**Purpose** Track all consumables required for laboratory operations, including reagents, kits, tubes, slides, chemicals, PPE, and consumables used across Pathology and Radiology.

**Core Features**
- Item Master (Name, Type, Vendor, Unit, Storage Condition, Reagent Category)
- Lot/Batch Management (Batch No, Expiry Date, Manufacturing Date)
- Stock In / Stock Out with audit logging
- Auto‑deduct stock based on Test → Reagent Mapping
- Reorder Levels, Minimum Stock Alerts
- Expiry Alerts (color‑coded)
- Wastage / Breakage logging
- Cost per test consumption calculation
- Vendor & Purchase history

**UI**
- Inventory Dashboard
- Reagent Usage per Test Report
- Low‑Stock Alerts
- Role Access: Admin + Inventory Manager + Lab Supervisors

### 26.2 Analyzer Integration Middleware (Phase 2 — High Priority)
**Purpose** Automate result acquisition from laboratory analyzers (Hematology, Biochemistry, Immunoassay, Coagulation, etc.)

**Supported Standards** ASTM, HL7 v2.x ORM/ORU, LIS2‑A2 Serial/TCP, vendor drivers

**Core Features**
- Instrument Connection Manager
- One‑way/Bi‑directional interfacing
- Auto‑match sample barcode → order
- Auto‑import results into Technician Review Queue
- Delta Checks & QC Data import
- Error handling & conflict resolution
- Real‑time status viewer

### 26.3 Accreditation & Compliance Module (Phase 3)
**Purpose** Support NABL / CAP / ISO15189 accreditation cycles.

**Components**
- Document Control (SOPs, Manuals, Forms)
- Equipment Calibration & Maintenance Log
- Environmental Monitoring
- PT / EQA Tracking
- CAPA workflows
- Internal Audit Scheduler
- Competency Assessment

### 26.4 External Lab Integration (Phase 2)
**Purpose** Enable labs to outsource specific tests.

**Core Features**
- Outsource Partner Master
- Test‑routing rules
- Sample Dispatch workflow
- Tracking (Dispatched → Received → Processed → Ready)
- Result PDF import
- Billing reconciliation

### 26.5 Critical Value Management (MVP Upgrade)
**Purpose** Ensure mandatory, traceable communication of life‑threatening results.

**Workflow**
1. Technician enters value → Critical Alert triggers.
2. Mandatory clinician notification.
3. Forced entry of contact log.
4. Pathologist reviews and signs off.

**UI**
- Critical Alerts Queue
- Acknowledgment Log
- Escalation Rules

### 26.6 HL7/FHIR Integration (Phase 3)
**Purpose** Hospital interoperability.

**Standards** HL7 v2.x (ADT/ORM/ORU), FHIR R4

**Features**
- Patient Sync
- Order Sync
- Result Publishing
- Error Queues

### 26.7 Patient Engagement (Phase 4)
**A) Mobile App (Android/iOS)** Report download, payment history, token status, appointment booking, push notifications  
**B) Appointment Booking Portal** Test selection, time‑slot booking, online payment, auto‑generate Visit & Token

### 26.8 Language Localization (Phase 3)
Support Hindi + regional languages for Public Token Display, Patient Reports, and Patient Portal/App.

### 26.9 Advanced Radiology Viewer (Phase 3+)
Enhancements: MPR, measurements, window/level presets, ROI tools, AI hooks.

### 26.10 External API Platform (Phase 4)
API Keys / OAuth2, Test Order API, Report Status Webhooks, Patient Sync API.

---
## 27. Lobby / Reception Token Display (Public Screen)
A patient‑facing real‑time screen that cycles current and next tokens per department (Pathology Collection, X‑ray, MRI/CT).

**Features**
- Big, high‑contrast tiles per department
- Current token, Next 3 tokens
- Audio chime + optional voice call (“Token P‑103 please proceed to Sample Collection”)
- Auto‑refresh via SignalR; kiosk full‑screen mode
- Hindi/regional language support

**Endpoints**
- `GET /api/v1/queue/public` → { departments:[{ name, current, next:[...] }] }

**Admin Settings**
- Enable/disable audio, language, chime volume, refresh fallback interval


## 6. Extended Core Modules (High-Priority Additions)

This section defines essential modules that elevate SynOS from a diagnostic-only system into a full, accreditation-ready, enterprise-grade Lab OS.

---

## 6.1 Inventory & Reagent Management (MVP-Critical)

### Purpose
Track all consumables required for laboratory operations, including reagents, kits, tubes, slides, chemicals, PPE, and consumables used across Pathology and Radiology.

### Core Features
- Item Master (Name, Type, Vendor, Unit, Storage Condition, Reagent Category)
- Lot/Batch Management (Batch No, Expiry Date, Manufacturing Date)
- Stock In / Stock Out with audit logging
- Auto-deduct stock based on Test → Reagent Mapping
- Reorder Levels, Minimum Stock Alerts
- Expiry Alerts (color-coded: <30 days, <7 days, expired)
- Wastage / Breakage logging
- Cost per test consumption calculation
- Vendor & Purchase history

### UI
- Inventory Dashboard (Stock Health, Expiry Summary, Consumption Analytics)
- Reagent Usage per Test Report
- Low-Stock Alert Banner + Notification
- Role Access: Admin + Inventory Manager + Lab Supervisors

---

## 6.2 Analyzer Integration Middleware (Phase 2 — High Priority)

### Purpose
Automate result acquisition from laboratory analyzers (Hematology, Biochemistry, Immunoassay, Coagulation, etc.)

### Supported Standards
- ASTM
- HL7 v2.x ORM/ORU
- LIS2-A2 Serial/TCP
- Vendor-specific drivers (Roche/Abbott/Siemens)

### Core Features
- Instrument Connection Manager
- One-way and Bi-directional interfacing
- Auto-match sample barcode → order
- Auto-import results into Technician Review Queue
- Delta Checks (against previous results)
- QC Data import (for Westgard rule application)
- Error handling (invalid sample ID, unreadable result, partial data)
- Real-time status viewer (Connected / Idle / Processing)

### UI
- Analyzer Control Panel
- Real-time Feed Monitor
- Manual Override (Manual Entry with “Override Reason”)
- Result Conflict Resolution Dialog

---

## 6.3 Accreditation & Compliance Module (Phase 3)

### Purpose
Support NABL / CAP / ISO15189 accreditation cycles with audit-ready documentation.

### Core Components
- Document Control (SOPs, Manuals, Forms) with versioning
- Equipment Calibration & Maintenance Log
- Environmental Monitoring (Temp/Humidity logs for refrigerators/incubators)
- PT / EQA (Proficiency Testing) Tracking
- CAPA (Corrective & Preventive Actions)
- Internal Audit Scheduler
- Competency Assessment for staff

### UI
- Accreditation Dashboard (Upcoming Audits, Pending CAPA, Overdue Calibrations)
- Document Library (searchable with version history)
- Equipment Calendar View

---

## 6.4 External Lab Integration (Phase 2)

### Purpose
Enable labs to outsource specific tests to partner/reference labs.

### Core Features
- Outsource Partner Master (Name, TAT, Pricing, Contact)
- Test-routing rules (which tests go to which partner)
- Sample Dispatch workflow (bags, manifests, courier details)
- Tracking (Dispatched → Received → Processed → Result Ready)
- Result PDF import + mapping to orders
- Reconciliation: Outsourced Bill → Lab Bill

### UI
- Outsource Dashboard (Pending Dispatch, Delayed Returns)
- Manifest Builder (auto-generate packing list)
- Result Import Panel

---

## 6.5 Critical Value Management (MVP Upgrade)

### Purpose
Ensure mandatory, traceable communication of life-threatening results.

### Workflow
1. Technician enters a value.
2. System triggers **Critical Alert** popup if threshold exceeded.
3. Technician must immediately notify clinician/referring doctor.
4. System forces entry of:
   - Person notified  
   - Time  
   - Mode (Phone/SMS/WhatsApp)
   - Notes
5. Pathologist reviews and signs off critical communication.

### UI
- Critical Alerts Queue (colored red)
- Acknowledgment Log (audit-safe)
- Escalation rules (if unacknowledged after X minutes)

---

## 6.6 HL7/FHIR Integration (Phase 3)

### Purpose
Enable SynOS to connect with hospital HIS/EMR systems.

### Supported Standards
- HL7 v2.x ADT/ORM/ORU
- FHIR R4 (Patient, Observation, DiagnosticReport, Encounter)

### Features
- Patient Sync
- Order Sync
- Real-time result publishing
- Error queue for failed messages

---

## 6.7 Patient Engagement (Phase 4)

### Components
### A) Patient Mobile App (Android/iOS)
- Report download
- Payment history
- Token status
- Appointment booking
- Push notifications (Report Ready, Payment, Offers)

### B) Appointment Booking Portal
- Select test/packages
- Time-slot calendar
- Pay online (UPI/Cards)
- Auto-generate Visit & Token for scheduled patients

---

## 6.8 Language Localization (Phase 3)

### Purpose
Support India’s multilingual environment.

### Supported Elements
- Hindi + Regional Languages for:
  - Public Token Display
  - Patient Reports
  - Patient Portal/App

### UI
- Language Switcher (Admin-managed)
- Multi-language report templates

---

## 6.9 Advanced Radiology Viewer (Phase 3+)

### Enhancements
- MPR (Multi-Planar Reconstruction)
- Distance measurements
- ROI tools
- Window/Level presets
- Spine labeling tools
- AI hooks for radiology future integration

---

## 6.10 External API Platform (Phase 4)

### Purpose
Enable third-party developers to integrate SynOS with external platforms.

### Features
- API Keys / OAuth2
- Test Order API
- Report Status Webhooks
- Report Retrieval API
- Patient Sync API



# SynOS – System Specification (Part 8: DICOM Viewer & Report Designer)

> This part closes two gaps: **Radiology DICOM Viewer (detailed)** and **Report Designer (embedded, Crystal-like)**. Choices are made for on‑prem Windows Server, Chrome clients, and zero‑mock policy.

---

## 90) DICOM Viewer (Radiology)
### 90.1 Architecture & Libraries
- **Cornerstone3D** (+ cornerstone‑tools) for 2D stacks and annotations.
- **VTK.js** (via Cornerstone3D integration) for **MPR** (axial/coronal/sagittal) and basic **3D** volume rendering.
- **dicomParser + dcmjs** for metadata and SR parsing.
- **WADO‑RS/HTTP loader** with fallbacks to file share (local URL scheme). Optional **DICOMDIR import** for offline CDs.
- **Web Workers** for decoding; **WASM** (GDCM/wasm) where supported.

### 90.2 Features (MVP → Plus)
**MVP**
- Series/study browser (thumbnails), stack scrolling, **window/level**, **zoom**, **pan**, **cine**.
- **Measurements**: length, angle, area (ellipse/polygon), point, text annotation; save to DB as JSON.
- **Key‑Image** selection (per study) with reasons; used by Delivery and AI exports.
- **Hanging Protocols**: 1×1, 1×2, 2×2 presets; remember last layout per radiologist.
- **Keyboard shortcuts** + right‑click quick tools; dark theme; high‑contrast UI.

**Plus (Phase 2/3)**
- **MPR** tri‑planar with linked cursors; thickness control; screenshot export.
- **3D volume** (basic DVR) for CT/MRI; preset transfer functions.
- **Measurements templates** per modality (e.g., OB, MSK) and copy‑forward between series.
- **Structured Report (SR) read** to prefill findings where available.

### 90.3 Persistence Model
- `ImagingStudies(StudyId, VisitId, Modality, Status, DicomPath, CompletedAt)`
- `KeyImages(KeyId, StudyId, SeriesUid, SopUid, Frame, Reason, CreatedBy, CreatedAt)`
- `Measurements(MeasId, StudyId, Tool, DataJson, SeriesUid, SopUid, Frame, CreatedBy, CreatedAt)`

### 90.4 Performance & Stability
- **Tile cache** (Cornerstone3D cache) sized per client; purge on study switch.
- Large file uploads: chunked 10–20 MB, resumable; server antivirus scan; checksum verify.
- Viewer sandboxed via strong **CSP**; no remote code; uploads validated by MIME + magic bytes.

### 90.5 APIs (Additions)
- `GET /api/v1/imaging/studies/{studyId}` → series list + metadata.
- `POST /api/v1/imaging/studies/{studyId}/key-images` `{ items:[{seriesUid,sopUid,frame,reason}] }`.
- `POST /api/v1/imaging/studies/{studyId}/measurements` `{ items:[{tool,dataJson,...}] }`.
- `GET /api/v1/imaging/studies/{studyId}/download?format=dicomdir|zip`.

### 90.6 Security
- Study access restricted by role + branch; signed URL for downloads; access logged.
- PHI never leaves without explicit export; AI exports use **key‑images** + weak labels only.

---

## 91) Report Designer (SynOS Report Studio)
### 91.1 Approach & Engine
- **Embedded designer** with server‑side rendering using **QuestPDF** (.NET) for accurate, fast PDF.
- Template stored as **JSON DSL**; designer produces JSON; renderer compiles to PDF.
- Deterministic output; no scripting in templates (prevents RCE). Expressions limited to safe functions.

### 91.2 Template Model (JSON DSL)
- `meta`: name, version, author, createdAt, letterhead, pageSize (A4/A5), margins.
- `layout`: one of `oneColumn | twoColumn | threeColumn`.
- `sections`: array of blocks; types: `Header`, `PatientInfo`, `ParameterTable`, `Text`, `Image`, `SignatureBlock`, `QR`, `Footer`, `PageBreak`.
- `styles`: fonts, sizes, colors, table rules, conditional rules.

### 91.3 Features (MVP)
- **Crystal‑like** layout control: precise positioning within columns, static and repeating sections.
- **Conditional formatting** rules (e.g., flag HL with color/bold).
- **Parameter tables** auto‑paginate; supports units, ref ranges, flags, comments.
- **Letterhead assets** per branch; doctor signature blocks; **QR** for online verify.
- **Template versioning** (immutable after publish); preview with real case data.
- **Multi‑column** (1/2/3) with per‑department presets (Pathology/Radiology/Combined Visit).

### 91.4 Advanced (Phase 2)
- Template variables with limited functions: `upper()`, `formatDate()`, `round(n, dp)`, `padLeft()`.
- **Localization** tokens; Hindi/regional on patient‑facing PDFs.
- **Sub‑reports** (e.g., culture sensitivity tables) as nested tables.

### 91.5 Designer UI
- Left **Blocks** palette; center **Canvas** with rulers & grid; right **Inspector** (props/styles/conditions).
- **Data Preview**: pick a visit → render preview (server), no PHI persisted.
- **Diff viewer** for versions; **Publish** gate with approver role.

### 91.6 APIs (Additions)
- `POST /api/v1/reports/templates` (create/update draft)  
- `POST /api/v1/reports/templates/{id}/publish`  
- `GET /api/v1/reports/templates/{id}/preview?visitId=...`  
- `POST /api/v1/reports/render` `{ visitId, templateId }` → PDF path  
- `GET /api/v1/reports/{reportId}/verify` → JSON with hash, signer, version

### 91.7 Data Binding
- Renderer receives **normalized payload** (Patient, Visit, Orders, Results, Ranges, Comments, Signers).
- No arbitrary DB queries from templates. All data comes via the API payload.

### 91.8 Migration Aids (from Crystal)
- Import existing header/footer as **SVG/PNG** assets.
- Semi‑auto converter script Crystal → JSON DSL for common blocks (header, patient info, table).
- Pixel‑perfect validation mode: overlay before/after.

---

## 92) Acceptance Criteria
**DICOM Viewer**
- Load 2D stacks; tools work at 60fps on mid‑range desktop; key‑images saved; MPR screenshot exports.
- Access control enforced; downloads logged.

**Report Designer**
- Build & publish a 1‑column Pathology, 2‑column Radiology, 3‑column Combined template.
- Conditional formatting highlights HL; QR opens verify page; versioning prevents edits after publish.

---
**End of Part 8.**

# SynOS – System Specification (Part 9: Backup, Recovery & Disaster Management)

> Production-grade backup + restore for on‑prem Windows Server with SQL Server and file storage (PDF/DICOM/templates). Includes **automatic** schedules and **manual** on‑demand backups from Admin UI.

---

## 93) Backup Strategy

**Database (SQL Server):**
- **Full backup** nightly at **11:00 PM IST** → `C:\SynOS\Backups\Database`
- **Transaction log** backup **every 15 minutes** for point‑in‑time recovery
- Compression enabled

**File System:**
- Daily sync of **Reports PDFs** (`C:\SynOS\Storage\Reports`), **DICOM** (`C:\SynOS\Storage\DICOM`), **Report Templates**, **Configs`)

**External Copies (Recommended):**
- Weekly copy to **USB drive** (offsite rotation)
- Optional NAS share mirror

**Retention:**
- 30 days of daily backups + 13 weeks of weekly archives

**Objectives:**
- **RTO ≤ 30 min**, **RPO ≤ 15 min**

---

## 94) Admin Recovery UI

**Location:** Admin → Settings → **Backup & Recovery**

**Capabilities:**
- Calendar of available backups (size, verified ✓, record counts)
- One‑click **Restore** (guided, 8 steps) with MFA
- **Point‑in‑time** restore (choose timestamp within last 7 days)
- Quarterly test‑restore tracking & log

**8‑Step Automated Restore:**
1. Enter UI and pick backup
2. Verify details summary
3. System places app in maintenance mode
4. Stop IIS / API services gracefully
5. Restore **database** (full + logs to timestamp)
6. Restore **file system** (PDF, DICOM, templates)
7. Restart services + health checks
8. Confirmation + email to admins

---

## 95) Manual Backup (On‑Demand)

**Why:** Before payroll, upgrades, bulk imports, audits, weekly verification.

**UI Flow:** Admin → Backup & Recovery → **Create Backup Now**  
1) Pick **type**: *Full DB* | *DB + Files* | *Files only*  
2) Name + optional description (reason)  
3) Start → **progress bar** with live log  
4) Success → **Download to USB** button + entry in history

**Storage:** `C:\SynOS\Backups\Manual` (auto‑named `SynOS_Manual_YYYYMMDD_HHMMSS_user`)

**History Tab:** Name | Date | Size | Status | Actions (Download / Restore / Delete)

**Best Practices (India):**
- Weekly manual backup (Friday), copy to USB, offsite rotation
- Keep 2–3 weeks of manual backups
- Quarterly test restore

---

## 96) Disaster Scenarios Covered

| Scenario | Time to Recover | Data Loss |
|---|---|---|
| Disk failure | 2–3 h | ≤ 15 min |
| Server format | 1.5–2.5 h | None |
| DB corruption | 30–45 min | Up to last 15‑min log |
| Partial file loss | 5–10 min | None |
| Complete site loss | 4–5 h | ≤ 15 min (with offsite USB/NAS) |

---

## 97) Compliance & Audit
- 10‑year medical record retention policy documented
- HIPAA‑aligned backup processes
- Audit trail for every **backup** and **restore** (who, when, why)

---

## 98) Implementation Notes
**SQL Jobs:** nightly FULL, 15‑min LOG, verification + checksum, email on success/failure.  
**File Backup:** `robocopy` scripts (logged) for reports/DICOM/templates.  
**Maintenance Mode:** returns friendly page to users during restore.  
**Health Checks:** after restart, verify DB connectivity, storage paths, job agents.

---

## 99) Backup APIs (Admin Only)
- `POST /api/v1/backups/manual/create` → start manual backup
- `GET  /api/v1/backups/manual/{backupId}/progress` → live % + log
- `POST /api/v1/backups/manual/{backupId}/download` → returns presigned link
- `POST /api/v1/backups/manual/{backupId}/restore` → initiate restore workflow
- `GET  /api/v1/backups/manual/history` → list manual backups
- `DELETE /api/v1/backups/manual/{backupId}` → delete

---
**End of Part 9.**

# SynOS – System Specification (Part 10: Patient IDs, Daily Tokens & Full History Tracking)

> Clear, production-ready rules for **permanent patient identification**, **daily token queues**, and **how complete history is stored & retrieved** across visits, orders, samples, results, reports, delivery and billing.

---

## 100) Permanent Patient ID (Simple, Huge Capacity)
**Format:** 6-character **alphanumeric** (Base36) — e.g., `A00001`, `AB1234`, `ZZZZZZ`  
**Capacity:** 36^6 = **2,176,782,336** unique IDs (~1,190 years at 5,000/day)

**Rules**
- Generated **once** per person at first registration; **never changes**.
- Printed on all slips/reports/invoices; used for search (also phone/name search).
- Alphanumeric only (no spaces/symbols) → easy to say on phone and type quickly.
- Stored as `Patients.PatientId` (VARCHAR(6)), unique, indexed.

**Generation (Server-Side)**
- Use a **monotonic sequence** (DB sequence table) and convert to Base36 with zero‑pad to 6.
- Reject collisions (unique index).

---

## 101) Daily Visit Tokens (Per Department, Midnight Reset)
**Format:** `DEPT-NNN` → `P-001` (Pathology), `X-023` (X‑ray), `M-005` (MRI), `C-014` (CT)

**Rules**
- **Resets at midnight** (local time, IST) **per department**.
- Counter starts at `001` each day for each department.
- Token is **operational queue number** for the day; not a medical identifier.
- Stored on `Visits.Token` and **the date in `Visits.TokenDate`** (DATE).

**Generation**
- `SELECT COUNT(*) + 1 FROM Visits WHERE Dept = @Dept AND TokenDate = CAST(GETDATE() AS DATE)`  
- Format with 3‑digit zero‑pad; prefix by department initial (`P`, `X`, `M`, `C`).

**Lobby / Public Display**
- “**NOW SERVING**” (current token per dept) + **NEXT 3**.
- Real‑time via SignalR; optional audio chime on call.

---

## 102) How History Is Tracked (What Gets Stored)
**One Patient → Many Visits → Many downstream rows**

Per visit, SynOS writes multiple linked rows:
- **Visits** (1): `VisitId`, `PatientId`, `Token`, `TokenDate`, `Dept`, timestamps
- **Orders** (N): one per test/panel
- **Samples** (N): barcoded tubes/containers (Pathology only)
- **Results** (N): **all parameter values** with units, ranges, flags
- **Reports** (1+): signed PDF(s), versioned
- **DeliveryLogs** (1): print/WhatsApp/email/link handover
- **Billing/Finance** (1): invoice, payment, credits
- **(Radiology)** ImagingStudies, KeyImages, Measurements as applicable

This is **why it’s not use‑and‑throw**: every value and file is kept with strong foreign‑keys.

---

## 103) “Is this 2nd/3rd visit?” (System Logic)
- **Count visits**: `SELECT COUNT(*) FROM Visits WHERE PatientId = @Pid`  
- **Ordered list**: `ROW_NUMBER() OVER (ORDER BY CreatedAt)` to show Visit #1, #2, #3…
- Show prior tokens/dates/tests/results to staff and doctors for context.

---

## 104) Reception Flow (End‑to‑End)
1) **Search** by phone/name/ID → found? use existing; not found? **create** → generate 6‑char ID.  
2) **Create Visit** → choose department/tests → system generates **departmental token** for **today**.  
3) **Payment** → mark paid → **print token slip** (thermal).  
4) **Queues** update in real‑time; department screens worklist includes this visit.

**Token Slip (Thermal)**
```
══════════════════════════════
  SynOS – Your Lab Name
══════════════════════════════
TOKEN: P-012           (today)
ID: A00001            (permanent)
Name: Ramesh Sharma
Date: 10 Nov 2025, 08:30
Dept: Pathology
Tests: CBC, FBS
══════════════════════════════
Please wait for your token call
══════════════════════════════
```

---

## 105) Database Requirements (Additions & Indexes)
- **Visits.TokenDate (DATE)** — required for daily reset logic + reporting.
- Indexes:
  - `IX_Visits_TokenDate_Dept (TokenDate, Dept, CreatedAt)`
  - `IX_Visits_Patient (PatientId, CreatedAt DESC)`
- Unique constraints:
  - `Patients.PatientId` **UNIQUE**
  - Optional: `Patients.Phone` with smart dedupe logic (not unique across family numbers).

---

## 106) Operational Jobs
- **Midnight Reset Check** (SQL Agent): verifies per‑department counters work off `TokenDate` (no destructive reset needed).
- **Data Quality Task**: daily report of potential duplicates by name+DOB+phone; human review at Reception/Admin.
- **Lobby Refresh**: watchdog to keep token display live (health‑check pings + auto‑reconnect).

---

## 107) Acceptance Criteria
- Register 3 new patients → `A00001`, `A00002`, `A00003` (no year, 6‑char).  
- Create 5 Pathology visits today → tokens `P-001…P-005`. Tomorrow begins at `P-001`.  
- Same patient returns after 6 months → same **permanent ID**, **new** daily token; all prior results visible.  
- Lobby shows **NOW** + **NEXT 3** per dept with real‑time updates.  
- Reports/invoices carry **both** Permanent ID and **today’s token**.

---
**End of Part 10.**

# SynOS – System Specification (Part 11: Analytics, Test Master & Audit Trail)

> Closes three critical gaps: **role‑based analytics APIs**, **Test & Parameter master + CSV import/migration**, and **end‑to‑end user auditing**.

---

## 110) Analytics APIs (Role‑Based, Cached)

**Endpoints**
- `GET /api/v1/analytics/dashboard?role={role}&date={YYYY-MM-DD}` – summary bundle for a role
- `GET /api/v1/analytics/kpi/{kpiName}?range=today|7d|30d` – single KPI
- `GET /api/v1/analytics/charts/{chartName}?filters=...` – a chart series
- `GET /api/v1/analytics/reports?dept=pathology|radiology&status=pending|final` – report queues

**Caching**
- KPIs: **60–120s**
- Charts: **300–900s**
- Real‑time deltas via **SignalR** to nudge widgets

**Role Filters**
- Reception: visits today, paid %, token queues, collections
- Path Lab Tech: pending results, verification queue, delta flags, TAT
- Pathologist: pending signatures, critical alerts, addenda, TAT
- Radiology Tech/Radiologist: scan backlog, reports signed
- Admin: revenue, discounts, referral payouts, system health

**Example SQL Sketches**
- Patients today: `SELECT COUNT(*) FROM Visits WHERE CAST(CreatedAt AS DATE)=CAST(GETDATE() AS DATE);`
- Revenue today: `SELECT SUM(NetAmount) FROM Invoices WHERE CAST(CreatedAt AS DATE)=CAST(GETDATE() AS DATE);`
- TAT distribution: group by `DATEDIFF(HOUR, CreatedAt, SignedAt)` on Reports

---

## 111) Test Master + Parameters (Admin + CSV Import)

**DB**
- `Tests(TestId PK, TestCode UNIQUE, TestName, Department, Category, BasePrice, IsActive, CreatedAt)`
- `Parameters(ParameterId PK, TestId FK, ParameterCode, ParameterName, Unit, RefLow, RefHigh, CriticalLow, CriticalHigh, IsActive)`

**Admin UI**
- Test list + status + price; inline edit
- Parameter grid per test
- Import/Export CSV

**CSV Import**
```
TestCode,TestName,Category,BasePrice,ParameterCode,ParameterName,Unit,RefLow,RefHigh,CriticalLow,CriticalHigh
CBC,Complete Blood Count,Hematology,300,WBC,White Blood Cell Count,10^3/µL,4.5,11.0,,
CBC,Complete Blood Count,Hematology,300,RBC,Red Blood Cell Count,10^6/µL,4.5,5.9,,
```
Validation: required fields, numeric ranges, duplicate codes, department mapping.

**Endpoints**
- `POST /api/v1/admin/tests/import-csv`
- `GET  /api/v1/admin/tests`
- `POST /api/v1/admin/tests`
- `PUT  /api/v1/admin/tests/{testId}`
- `GET  /api/v1/admin/tests/{testId}/parameters`
- `POST /api/v1/admin/tests/{testId}/parameters`

**Migration (Old DLMS → SynOS)**
1. Export tests/parameters as CSV
2. Normalize codes, units, ranges
3. Import via API
4. Verify counts and sample render

---

## 112) User Management & Audit Trail (Compliance)

**Users (enhanced)**
- `Users(UserID PK, Email UNIQUE, FullName, PasswordHash, RoleID, Department, MFAEnabled, LastLogin, IsActive, CreatedAt, CreatedBy)`
- Role examples: `Reception`, `PathTech`, `Pathologist`, `RadTech`, `Radiologist`, `Delivery`, `HR`, `Admin`

**Audit Log**
- `AuditLog(AuditLogID PK, UserID FK, Action, Entity, EntityID, OldValue, NewValue, Timestamp, IPAddress, Details)`
- Indexes: `IX_AuditLog_UserID`, `IX_AuditLog_Timestamp`

**Typical Events**
- `Sample.Collected` (who/when/tube/barcode)
- `Result.Entered` / `Result.Corrected`
- `Report.Signed`
- `Login.Success` / `Login.Failed`

**Endpoints**
- `POST /api/v1/admin/users` (create; auto‑generate `USR_<DEPT>_<SEQ>`)
- `GET  /api/v1/admin/users` (paginated)
- `GET  /api/v1/audit-logs` (filters: action, entity, userId, date range)
- `POST /api/v1/audit-logs/export` (CSV)

**Compliance Queries**
- All actions by a user today
- Full history of a sample/result/report
- Who signed report X and when

---
**End of Part 11.**