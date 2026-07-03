# SYNOS_CURRENT_STATE_JUNE_2026

## Project Overview

SynOS is a full Diagnostic Laboratory & Radiology Operating System being developed by TBZ Labs.

The system is designed for medium to large diagnostic centers and focuses on operational workflow execution rather than traditional hospital ERP administration.

Core philosophy:

* Operational First
* Workflow Driven
* Fast on Low-End Hardware
* Branch Aware
* Lab + Radiology Unified
* AI Ready
* Integration Ready

---

# Current Architecture

## Backend

Technology Stack:

* ASP.NET Core
* Entity Framework Core
* SQL Server
* SignalR

Primary Services:

* ReceptionFlowService
* ProcessingService
* ResultService
* ReportingService
* RadiologyService
* OperationsEngine
* Inventory Services
* ControlTower Services

---

## Frontend

Technology Stack:

* React
* Vite
* Tailwind

Major Screens:

* Reception
* Phlebotomy
* Lab Workbench
* Reports Typing
* Pathologist Terminal
* Delivery Desk
* X-Ray Technician
* Ultrasound Technician
* CT Technician
* MRI Technician
* Radiologist
* Test Master
* Report Templates
* Inventory Setup
* Control Tower Dashboard

---

# Core Workflow

Laboratory Workflow

Patient Arrival

↓

Reception

↓

Billing

↓

Payment

↓

Sample Collection

↓

Lab Processing

↓

Report Typing

↓

Pathologist Verification

↓

Delivery Desk

↓

Patient Report Delivery

---

Radiology Workflow

Patient Arrival

↓

Reception

↓

Billing

↓

Payment

↓

Modality Assignment

↓

X-Ray / US / CT / MRI

↓

Radiologist Reporting

↓

Delivery Desk

↓

Patient Report Delivery

---

# Major Completed Modules

## Reception

Status:

Completed and operational.

Capabilities:

* Visit creation
* Patient registration
* Billing
* Payment processing
* Order generation
* Token generation

---

## Phlebotomy

Status:

Operational.

Capabilities:

* Sample collection
* Collection queues
* Specimen tracking

---

## Lab Workbench

Status:

Operational.

Capabilities:

* Result entry
* Parameter processing
* Workflow progression

---

## Reports Typing

Status:

Operational.

Capabilities:

* Clinical report drafting
* Rich text narrative editing
* Shared narrative model with Pathologist

---

## Pathologist Terminal

Status:

Operational.

Capabilities:

* Review reports
* Edit narrative
* Verify reports
* Sign reports

---

## Delivery Desk

Status:

Operational.

Capabilities:

* Report dispatch
* Report delivery tracking

---

# Radiology Module

Status:

Advanced implementation completed.

Supported Modalities:

* X-Ray
* Ultrasound
* CT
* MRI

Roles:

* Technician
* Radiologist

Capabilities:

* Study creation
* Imaging workflow
* Dictation workflow
* Reporting workflow
* Signature workflow

---

# Test Master System

Status:

Major redesign completed.

Purpose:

Acts as the source of truth for laboratory test definitions.

Capabilities:

* Parameter configuration
* Reference range configuration
* Report template assignment
* Pricing
* Interpretation templates

---

# Interpretation Template System

Status:

Completed.

Major Design Decisions:

## Single Source Of Truth

Interpretation templates are configured only in Test Master.

Test:

* DefaultInterpretation

stores:

* Serialized TipTap JSON

---

## Runtime Seeding

When a report is opened:

ReportingService:

1. Loads report.
2. Checks ReportInterpretation.
3. If empty:

   * Loads Test.DefaultInterpretation.
4. Seeds editor.

No duplicate storage.

---

## Shared Narrative Model

Typist and Pathologist now share:

Single Narrative

No separate:

* Observation
* Comments
* Secondary editor

Narrative content is stored once and displayed everywhere.

---

# Report Rendering Architecture

Status:

Unified.

Single report rendering engine:

ReportA4

Used by:

* Test Master Preview
* Typist Preview
* Pathologist Preview
* Final Report Output

---

## Removed Hardcoded Elements

Removed:

* Observation / Inference headings
* Comments headings
* Default General section headers
* Hardcoded diagnostic report labels

Everything now originates from Test Master configuration.

---

# Report Title System

Status:

Completed.

New Field:

ReportTitle

Stored per Test.

Purpose:

Allows each test to define its own report heading.

Examples:

* HAEMATOLOGY REPORT
* COMPLETE BLOOD COUNT
* LIVER FUNCTION PROFILE
* CUSTOM TITLE

No hardcoded report titles remain.

---

# Control Tower Dashboard

Status:

Under active redesign.

Decision Locked:

Workflow Funnel Dashboard

Not Throughput Dashboard.

---

## Funnel Logic

Example:

Reception:
200 billed

Phlebotomy:
180 collected

Lab Workbench:
160 processed

Typing:
150 typed

Pathologist:
120 verified

Delivery:
90 delivered

Each card shows:

Primary:
Workflow progression count

Secondary:
Current backlog

---

## Branch Support

Two Modes:

### Branch View

Metrics only for selected branch.

### Consolidated View

Metrics across all branches.

---

# Inventory Management

Status:

Partially completed.

Completed:

* Stock Ledger
* Request Queue
* Dashboard Metrics

Planned:

* Purchasing
* Vendor Workflows
* Procurement Automation

---

# AI Readiness

SynOS is being prepared for:

* AI Report Assistance
* AI Operational Insights
* AI WhatsApp Agents
* AI Customer Communication

No AI logic is directly embedded inside operational workflows.

AI integrations must consume exposed services and APIs.

---

# External Integration Philosophy

SynOS remains the operational source of truth.

External systems must not directly manipulate workflow states.

All integrations should pass through middleware services.

---

# Completed Middleware Layer

Purpose:

Provide integration between SynOS and external platforms.

Examples:

* WhatsApp Delivery Manager (Active)
* TBZ Labs Control Tower Dashboard (Active)
* SQLite-based Analytics Store (Active)
* AI Agents Integration Contracts (Ready)

Responsibilities:

* Data synchronization (Transactional Outbox Pattern via `MiddlewareSyncWorker` posting to port `5069`)
* Event aggregation and database fact projection (`PatientVisitFact`, `PatientIntelligenceFact` in SQLite)
* Cross-branch analytics
* Notification routing (Meta Graph API templates)
* Hybrid tunnel proxying (forwarding Meta webhooks via `WhatsAppWebhookProxyController.cs` in SynOS)

Must not replace operational logic inside SynOS.

---

# Critical Architectural Rules

1. Test Master is the source of truth for report configuration.

2. Interpretation templates originate only from Test Master.

3. ReportA4 is the single rendering engine (including absolute coordinate template offsets).

4. Typist and Pathologist share one narrative.

5. Workflow states must remain authoritative inside SynOS.

6. Middleware consumes SynOS data but does not own operational workflows.

7. Branch-aware design is mandatory.

8. Consolidated multi-branch reporting must remain supported.

---

# Current Project Status

Overall Progress Estimate:

90-95%

Completed:

* Laboratory workflows
* Radiology workflows
* Test Master redesign
* Interpretation template architecture
* Report rendering unification (QuestPDF A4 absolute positioning support)
* Middleware integration layer (SQLite projections and outbox listener)
* WhatsApp Delivery Manager (Meta Graph template dispatch and webhook proxying)

In Progress:

* Control Tower funnel refinement
* Inventory completion

Upcoming:

* Super Admin Dashboard scaling
* AI Operational Services
* Multi-branch analytics expansion
* Customer communication platform expansions
