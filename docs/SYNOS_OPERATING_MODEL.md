# SynOS: The Diagnostic Operating System (Operating Model)

This document outlines the system architecture, organizational relationships, departmental pipelines, real-time synchronization flows, and management controls of SynOS. It serves as a blueprint for designing interactive visual storyboards, scroll-driven narratives, and system orchestration diagrams for the TBZ Labs product experience page.

---

## 1. Executive Overview

### What is SynOS?
SynOS is not a traditional Laboratory Information Management System (LIMS) or Diagnostic Laboratory Management System (DLMS). It is a **Diagnostic Operating System**. 

Legacy software acts as a static database—a system of record where operators manually input data after tasks are finished. SynOS acts as a **system of action and coordination**. It runs a real-time event-driven loop that active-syncs reception desks, phlebotomy bays, laboratory counters, radiology suites, pathologist desks, and administration ledgers.

```
       [ Reception Desk ] ----(Registration)----> [ Billing & Payment ]
               |                                           |
               |                                           v
    [ Live Activity Stream ] <---(Updates)------- [ Phlebotomy Queue ]
               |                                           |
               v                                           v
      [ Director Dashboard ]                     [ Department Workbench ]
                                                 (Lab / Path / Radio / CT)
```

### Why it is called an "Operating System"
In computing, an Operating System schedules tasks, coordinates hardware devices, manages resource consumption, and handles communication between processes. 

SynOS does the same for a diagnostic center:
1. **Process Scheduler (Action Queues)**: Schedules patient workflows across departments, routing them dynamically based on payment status, sample viability, and machine availability.
2. **Device Coordination (PACS & DICOM)**: Connects imaging hardware directly to radiologist workspaces.
3. **Resource Management (Inventory Engine)**: Tracks reagent and consumable consumption automatically as tests run.
4. **Inter-Process Communication (SignalR & Real-Time Deltas)**: Broadcasts updates across terminals immediately, eliminating verbal check-ins and walking between departments.

### The Problem it Solves
Traditional software creates **operational silence**. Receptionists don't know if a patient is waiting at phlebotomy; pathologists don't know if a critical sample is being processed; directors have no idea about real-time cash flow or machine bottlenecks until the end of the month. This results in:
* High turnaround time (TAT) due to queue stagnation.
* Revenue leakage from unverified discount approvals or misrouted outsourced tests.
* Lost or mislabeled physical samples.
* Pathologist burnout due to inefficient transcription pipelines.

### SynOS vs. Traditional DLMS
| Operational Dimension | Traditional LIMS / DLMS | SynOS (Diagnostic OS) |
| :--- | :--- | :--- |
| **Data Flow** | Pull-based (manual refreshes, searching for records) | Push-based (real-time SignalR notifications, live streams) |
| **Coordination** | Silent (reception has no visibility into lab status) | Connected (instant visual changes across screens) |
| **Execution** | Manual logging (technicians type data after the fact) | Automated triggering (billing unlocks phlebotomy; validation unlocks printing) |
| **Administration** | Siloed ERP (finance and HR run in separate software) | Exception-based & Linked (attendance feeds payroll; inventory feeds finance) |

---

## 2. Organizational Structure

SynOS models the physical topology of a diagnostic laboratory. The following roles and departments participate in the system:

```
                          ┌──────────────────────────┐
                          │   Director / Owner       │
                          └────────────┬─────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
  ┌──────────────────────────┐                  ┌──────────────────────────┐
  │      Administration      │                  │    Clinical Operations   │
  └─────────────┬────────────┘                  └─────────────┬────────────┘
                │                                             │
      ┌─────────┼─────────┐                         ┌─────────┼─────────┐
      ▼         ▼         ▼                         ▼         ▼         ▼
  ┌───────┐ ┌───────┐ ┌───────┐                 ┌───────┐ ┌───────┐ ┌───────┐
  │Finance│ │  HR   │ │Inventory                │Recepn │ │Lab/Phl│ │Imaging│
  └───────┘ └───────┘ └───────┘                 └───────┘ └───────┘ └───────┘
```

1. **Director**: The owner/management user who monitors operations, financials, performance KPIs, and bottlenecks from a single high-level panel.
2. **Administration**: Responsible for billing governance, revenue/expense reconciliation, purchasing, and staff management.
3. **Reception & Billing**: The initial touchpoint for patient registration, invoice generation, discount application, and payment verification.
4. **Sample Collection (Phlebotomy)**: The bay where biological samples (blood, urine, swab) are drawn, barcoded, and validated.
5. **Laboratory Departments (Pathology / Biochemistry / Hematology / Microbiology)**: The analytical core where samples are loaded onto analyzers and parameters are recorded.
6. **Imaging Departments (Radiology / MRI / CT / Ultrasound)**: The diagnostic imaging suites where scans are captured and sent to the PACS (Picture Archiving and Communication System).
7. **Reporting & Transcription**: The typing pool where draft reports are formatted, using medical macros for fast data entry.
8. **Clinical Signing Authority (Pathologists & Radiologists)**: Certified doctors who review results, compare parameters with historical benchmarks, and digitally sign reports.

---

## 3. Department Responsibilities

### Reception & Billing
* **Primary Responsibilities**: Patient check-in, demographic recording, B2B partner mapping, test billing, cash/online payment collections, and invoice printing.
* **Inputs**: Walk-in patient requests, B2B doctor referrals, payment details.
* **Outputs**: Registered Patient MRN, Billing Invoices, Payment Status tokens.
* **Dependencies**: Relies on Catalog definitions (Test Master) for correct test pricing and B2B pricing configurations.
* **Information Exchanged**: Sends verified payment signals to Phlebotomy and Imaging queues.

### Sample Collection (Phlebotomy)
* **Primary Responsibilities**: Sample extraction, barcode labeling, sample check-in, and verification of fasting/safety protocols.
* **Inputs**: Paid billing tokens, patient medical history alerts.
* **Outputs**: Physical barcoded tubes, Sample Collected events in the system.
* **Dependencies**: Blocked until Billing releases the patient (Payment Verified or Credit Approved).
* **Information Exchanged**: Sends collection timestamps and sample-ID mappings directly to the laboratory workbenches.

### Laboratory Departments (Pathology, Biochemistry, etc.)
* **Primary Responsibilities**: Analytical processing of biological specimens, recording parameter values, flag verification (abnormal/critical values).
* **Inputs**: Barcoded samples, analyzer output logs.
* **Outputs**: Raw parameter results, abnormal alerts.
* **Dependencies**: Requires checked-in samples from Phlebotomy.
* **Information Exchanged**: Pushes completed test values to the Typist Terminal and Phlebotomy intent lists.

### Imaging Departments (MRI, CT, Ultrasound)
* **Primary Responsibilities**: Patient scanning, DICOM metadata association, image transfer to PACS.
* **Inputs**: Ordered radiology scan tokens, patient safety checklists.
* **Outputs**: High-resolution DICOM slices stored in PACS, workstation study links.
* **Dependencies**: Blocked until payment is confirmed or credit is authorized.
* **Information Exchanged**: Broadcasts scan completion and study links to the Radiologist Terminal.

### Reporting & Transcription
* **Primary Responsibilities**: Speed-typing pathology narratives, formatting templates, applying medical macros, and organizing draft reports for doctor reviews.
* **Inputs**: Technical lab values, draft reports.
* **Outputs**: Formatted clinical reports awaiting signature.
* **Dependencies**: Requires lab technician data entry or radiologist dictation.
* **Information Exchanged**: Passes typed reports to the Pathologist or Radiologist signing queue.

### Pathologists & Radiologists (Clinical Signing Authority)
* **Primary Responsibilities**: Medical validation of findings, historical comparison, report signing, and dispatching critical notifications.
* **Inputs**: Structured results, historical records, PACS image links.
* **Outputs**: Electronically signed PDF reports (Digital or Preprinted formats).
* **Dependencies**: Locked until the Typist/Technician completes transcription.
* **Information Exchanged**: Pushes signed PDF releases to Delivery Desk and updates Director KPIs.

### Administration & Finance
* **Primary Responsibilities**: Ledger tracking, B2B doctor commission management, procurement, expense tracking, payroll processing.
* **Inputs**: Collection logs, inventory purchase invoices, employee attendance entries.
* **Outputs**: Profit & Loss statements, stock purchase orders, payroll disbursements.
* **Dependencies**: Relies on Reception collections data and Inventory usage logs.
* **Information Exchanged**: Reconciles reference laboratory bills and generates referral payments.

---

## 4. End-to-End Patient Journey

The lifecycle of a patient visit is tracked step-by-step across different interfaces and modules:

```
[Arrival] ──(ReceptionScreen)──> [Billing] ──(Payment verified)──> [Phlebotomy Queue]
                                                                        │
[Validation] <──(PathologistTerminal)── [Typing] <──(Lab Work) ◄────────┘
     │
     └──(Print/WhatsApp)──> [Delivery]
```

### 1. Patient Arrival
* **Action**: Receptionist registers the patient details.
* **Screen**: `ReceptionScreen.jsx` -> Registration Drawer.
* **Departments Notified**: None (Draft stage).
* **Data Created**: Temporary Patient demographic object.

### 2. Billing & Test Selection
* **Action**: Receptionist searches and adds tests from the catalog, selects referral partner, and applies rules-based discounts.
* **Screen**: `IntentPanel.jsx`.
* **Departments Notified**: Finance (Revenue pending status).
* **Data Created**: Invoice ledger draft, assigned test codes.

### 3. Payment Verification
* **Action**: Cash is collected or online QR code scanner payment confirms receipt.
* **Screen**: `IntentPanel.jsx` / Payment Drawer.
* **Departments Notified**: Phlebotomy, Imaging, Finance.
* **Data Created**: `PaymentReceived` event, finalized `Visit` ID, invoice token number.

### 4. Sample Collection
* **Action**: Phlebotomist draws blood/sample, scans barcode.
* **Screen**: `PhlebotomyScreen.jsx` (Action Queue updates from "Pending Payment" to "Actionable").
* **Departments Notified**: Specific Laboratory Department (Pathology, Biochemistry, etc.).
* **Data Created**: `SampleCollected` event, barcode timestamp record.

### 5. Laboratory Testing
* **Action**: Lab technician processes the sample and enters numerical results.
* **Screen**: `DepartmentWorkbenchScreen.jsx` (Spreadsheet-style inline parameter grid).
* **Departments Notified**: Transcription/Typist terminal.
* **Data Created**: `ParametersEntered` status, abnormal flags generated if values cross demographic limits.

### 6. Report Transcription
* **Action**: Medical typist applies layout templates and macros to clean up raw values.
* **Screen**: `TypistTerminal.jsx` (Dual Split Screen: Left test selection, Right WYSIWYG editor).
* **Departments Notified**: Signing Authority (Pathologist or Radiologist).
* **Data Created**: `ReportDraftCompleted` status.

### 7. Clinical Review & Approval
* **Action**: Pathologist/Radiologist compares data with historical trends and digitally signs the report.
* **Screen**: `PathologistTerminal.jsx` (Interactive PDF signing sheet).
* **Departments Notified**: Reception/Delivery Desk, Director.
* **Data Created**: Finalized PDF blob, `ReportSigned` event, updated Turnaround Time (TAT) metrics.

### 8. Report Delivery
* **Action**: Report is printed (Digital or Preprinted mode) or sent automatically via WhatsApp/Email.
* **Screen**: `DeliveryTerminal.jsx` (Print queue).
* **Departments Notified**: Reception, Finance (marks transaction as complete).
* **Data Created**: Dispatch log update.

---

## 5. Real-Time Coordination Events

The heartbeat of SynOS is its real-time event-driven loop. When an event fires, it ripples through multiple screens instantly:

### Event: Patient Registration & Payment
* **System Action**: Broadcasts `VisitStarted` via SignalR.
* **Reception Action Queue**: Adds a new live item under "Today" group.
* **Phlebotomy Terminal**: A red dot appears next to the "Live Queue" count; patient appears in Phlebotomy Action Queue.
* **Activity Stream**: Appends: `"Token #1024: Patient Jane Doe visit started by Receptionist Ravi"`
* **Director Dashboard**: The "Walk-ins Today" counter increments by 1.

### Event: Sample Collection Completed
* **System Action**: Broadcasts `SampleCollected` via SignalR.
* **Phlebotomy Terminal**: Patient moves from "Actionable" to "History" list.
* **Laboratory Terminal**: Patient appears in the Pathology Department Queue as "Processing".
* **Activity Stream**: Appends: `"Token #1024: Blood sample drawn by Phlebotomist Priya"`

### Event: Pathology Results Logged
* **System Action**: Broadcasts `ResultsEntered` via SignalR.
* **Laboratory Terminal**: Row color changes to light green (Ready for review).
* **Typist Terminal**: Patient highlights in the "Needs Typing" sidebar list.

### Event: Report Approval (Signed)
* **System Action**: Generates PDF, uploads to storage, broadcasts `ReportFinalized`.
* **Pathologist Terminal**: Patient is cleared from the pending signing queue.
* **Delivery Desk**: Patient card highlights in green with a "Ready for Print/Send" badge.
* **Director Dashboard**: Pushes a new TAT entry: `"Average Report Time: 45m"`.

---

## 6. Administrative Operations

Administrative tasks in SynOS run on an **Exception-Based Model** to maximize efficiency:

```
[ Attendance (Present by default) ] ───(Absence Exception)───> [ Payroll Adjustments ]
                                                                       │
[ Inventory consumption (Auto-deducted) ] ───(Reorder Point)───> [ Finance Expense Ledger ]
```

### Finance
* **Revenue Tracking**: Every billing confirmation posts an automated entry to the sales ledger. Returns or corrections require multi-factor manager authorization.
* **Expense Tracking**: Supplier invoices for reagents or consumables post to the expense ledger, feeding into the live Profit & Loss calculation.
* **Outsource Ledgers**: Track external tests sent to reference labs, automating payments to outsource partners.

### Inventory
* **Auto-Consumption**: Every test configuration in the Test Master lists required reagents. When a report is signed, SynOS automatically decrements the stock levels.
* **Procurement**: Alerts trigger when stock hits predefined reorder thresholds, generating draft purchase orders for approval.

### HR & Payroll
* **Exception Attendance**: Staff members are marked as "Present" by default. HR only inputs exceptions (Leaves, Late arrivals, Shift swaps).
* **Payroll**: Reconciles monthly attendance records, adjusts allowances, deducts tax liabilities, and calculates payouts, posting the total disbursements to the Finance ledger.

---

## 7. Radiology Operating Model

The radiology workflow is designed for speed and large file handling:

```
[MRI/CT Scan] ──(DICOM Upload)──> [PACS Server] ──(Workstation link)──> [Radiologist Terminal]
                                                                                │
[Signed Report] <──(Digital Signature)── [Transcription] <──(Voice Dictation) ◄─┘
```

1. **Scan Ordering**: Reception bills the CT/MRI scan. A worklist entry is sent directly to the imaging machine console via Modality Worklist (MWL) protocol.
2. **Imaging**: The technologist performs the scan. The machine outputs DICOM format image files and pushes them to the PACS server.
3. **PACS Integration**: PACS associates the DICOM study with the patient's SynOS ID. A viewer link is attached to the patient file in SynOS.
4. **Radiologist Review**: The radiologist receives a notification. Clicking the patient record in the `RadiologistTerminal.jsx` opens the image viewer alongside a voice-dictation panel.
5. **Report Generation**: The radiologist records findings, which are typed by a transcriptionist using customized templates.
6. **Report Distribution**: The radiologist approves the report using the `Radiologist` signature slot, uploading the final document to the patient profile for delivery.

---

## 8. Laboratory Operating Model

Pathology workflows leverage automated rule checks to reduce clinical errors:

```
                  ┌──────────────────────────┐
                  │  Sample Check-in (Phleb) │
                  └────────────┬─────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
  ┌──────────────────────────┐  ┌──────────────────────────┐
  │   Automated Analyzers    │  │   Manual Entry (Grids)   │
  └─────────────┬────────────┘  └─────────────┬────────────┘
                │                             │
                └──────────────┬──────────────┘
                               │
                               ▼
  ┌──────────────────────────┐  ┌──────────────────────────┐
  │   Smart Range Checks     │  │   Typist Template Match  │
  └─────────────┬────────────┘  └─────────────┬────────────┘
                │                             │
                └──────────────┬──────────────┘
                               │
                               ▼
  ┌──────────────────────────┐  ┌──────────────────────────┐
  │  Pathologist Validation   │  │   PDF Report Dispatch    │
  └──────────────────────────┘  └──────────────────────────┘
```

1. **Specimen Routing**: Physical samples are routed to specific departments (Hematology, Biochemistry, Microbiology).
2. **Analyzer Integrations**: Integrated analyzers run tests and push results directly to SynOS, auto-populating fields.
3. **Manual Entry**: For non-automated tests, technicians log results using the spreadsheet-like input grid in `DepartmentWorkbenchScreen.jsx`.
4. **Smart Range Checks**: SynOS checks results against reference ranges, flagging abnormal and critical values.
5. **Pathologist Validation**: The pathologist logs into `PathologistTerminal.jsx`, reviews flagged values, compares them with past visits, and approves them.

---

## 9. Data Flow Relationships

The relationships between modules define the operational integrity of SynOS:

```
┌─────────────────────────┐          ┌─────────────────────────┐
│ Patient Registration    ├─────────>│ Department Queues       │
└─────────────────────────┘          └─────────────────────────┘
┌─────────────────────────┐          ┌─────────────────────────┐
│ Billing Confirmation    ├─────────>│ Revenue Ledgers         │
└─────────────────────────┘          └─────────────────────────┘
┌─────────────────────────┐          ┌─────────────────────────┐
│ Attendance Exceptions   ├─────────>│ Monthly Payroll         │
└─────────────────────────┘          └─────────────────────────┘
┌─────────────────────────┐          ┌─────────────────────────┐
│ Signed Reports          ├─────────>│ Stock Auto-Consumption  │
└─────────────────────────┘          └─────────────────────────┘
┌─────────────────────────┐          ┌─────────────────────────┐
│ Payroll Disbursements   ├─────────>│ Finance Ledgers         │
└─────────────────────────┘          └─────────────────────────┘
```

* **Registration** initiates the workflow.
* **Billing** validates the workflow and unlocks operations.
* **Attendance** drives payroll adjustments.
* **Clinical Approvals** deduct inventory stock.
* **Payroll disbursements** are reconciled in the main ledger.

---

## 10. Director / Management View

The Director dashboard provides a unified control center for management:

* **Real-time Operations KPI**: Shows active patient volumes, current bottlenecks, and live queue wait times.
* **Financial Ledger Visibility**: Tracks daily collections, outstanding B2B balances, and inventory spend.
* **Staff Performance Tracking**: Logs report turnaround times (TAT) and data entry volumes.
* **Operational Alerts**: Signals critical test levels, inventory shortages, and network sync statuses.

---

## 11. Future Vision

Planned system updates include:

* **WhatsApp Report Delivery**: Pushing PDF report links to patient phone numbers automatically upon signature validation.
* **Integrated Machine Analyzers**: Direct RS232/TCP connections for automatic test logging.
* **B2B Doctor Portals**: Independent web views for partner clinics to track referrals.
* **AI Transcription Assistance**: Automated transcription drafts matching spoken pathologist dictation.

---

## 12. Visual Storyboard For Website

This storyboard details ten interactive scenes for the TBZ Labs product experience page, showing how SynOS coordinates a diagnostic center:

### Scene 1: The Patient Arrives
* **Visuals**: A clean, isometric view of the diagnostic center. A patient enters the lobby and approaches the reception desk.
* **SynOS Interface overlay**: A floating, simplified view of the **Registration Drawer** appears next to the receptionist, displaying field completions.
* **Core Message**: *SynOS starts orchestration at the front door.*

### Scene 2: Interactive Billing
* **Visuals**: The registration form updates. A cursor searches for tests (e.g., "CBC", "Lipid Profile"), applying rules-based discounts and partner rates.
* **SynOS Interface overlay**: The **Intent Panel** slides in. An invoice is created.
* **Core Message**: *Dynamic billing rules are enforced instantly, eliminating manual price lists.*

### Scene 3: Payment Confirmation
* **Visuals**: A payment signal flashes green. The patient receives a token card.
* **SynOS Interface overlay**: A notification pops up on the Phlebotomy Terminal showing patient Jane Doe is ready.
* **Core Message**: *Payments unlock the clinical queue immediately across the system.*

### Scene 4: Collection Team Workflow
* **Visuals**: The patient sits in the phlebotomy chair. The phlebotomist draws a sample and scans a barcode.
* **SynOS Interface overlay**: The patient moves from the "Pending Collection" tab to the "Completed" tab on the **Phlebotomy Terminal**.
* **Core Message**: *Sample tracking is verified at the point of collection.*

### Scene 5: Laboratory Processing
* **Visuals**: The lab technician places the sample tube inside an analyzer.
* **SynOS Interface overlay**: The **Department Workbench** sheet highlights the patient row, and parameter values auto-populate.
* **Core Message**: *Result transcription is automated, preventing manual data entry errors.*

### Scene 6: Radiology Scan Capture
* **Visuals**: The patient enters the MRI suite. The scan is completed.
* **SynOS Interface overlay**: The DICOM image transfer animation sends scans to PACS. A link lights up on the Radiologist's screen.
* **Core Message**: *Imaging hardware and clinical databases sync automatically.*

### Scene 7: Reagent Consumption
* **Visuals**: The lab analyzer finishes the run. A virtual bottle of reagent drops its fill level.
* **SynOS Interface overlay**: The **Inventory Module** shows a stock reduction of 1 unit.
* **Core Message**: *Supplies are tracked in real-time as tests complete.*

### Scene 8: The Doctor's Review
* **Visuals**: The pathologist views the report on screen, comparing results with historical trends. A digital signature is applied.
* **SynOS Interface overlay**: The pathologist clicks "Approve & Sign".
* **Core Message**: *Digital signatures approve and seal reports securely.*

### Scene 9: Revenue Ledger Updates
* **Visuals**: The signed report triggers a dispatch. The cash collected logs update.
* **SynOS Interface overlay**: The **Finance Ledger** displays the transaction value alongside the doctor commission calculations.
* **Core Message**: *Clinical completions post financial transactions instantly.*

### Scene 10: Unified Management Visibility
* **Visuals**: The camera zooms out to an isometric view of the clinic, displaying live stats above each department.
* **SynOS Interface overlay**: The **Director Dashboard** displays KPIs: Total Walk-Ins, Cash Flow, and Average Turnaround Time.
* **Core Message**: *SynOS is the complete operating system for modern diagnostic laboratories.*
