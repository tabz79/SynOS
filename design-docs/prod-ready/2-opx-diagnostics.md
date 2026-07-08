# Diagnostics Service Architecture Specification

This document defines the architectural specification for the Diagnostics Service within SynOS. Using the principles of @[design-docs/opx-foundation.md](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/design-docs/opx-foundation.md), this document details the creation, packaging, contents, and privacy policies of the Diagnostic Bundle.

---

## 1. Purpose

The Diagnostics Service inside SynOS is responsible for aggregating system telemetry, application logs, host configurations, and process state information into a unified, lightweight, and structured payload called the **Diagnostic Bundle**. 

The Diagnostic Bundle serves as the primary debugging artifact for the operations team. It captures sufficient operational and workflow context so that an engineer or an automated LLM (like GPT or Claude) can reconstruct the exact sequence of events leading up to an issue, evaluate system health, and diagnose the root cause without requiring a direct connection to the client's machine.

---

## 2. Responsibilities

The Diagnostics Service runs locally on the SynOS instance and is responsible for:
* **Trigger-Based Assembly**: Constructing a diagnostic payload when system parameters cross error thresholds or on explicit user request.
* **Telemetry Categorization**: Extracting system metrics, outbox queue sizes, active configuration schemas, and Serilog text logs within a strict time window.
* **PII Redaction**: Ensuring that no patient-identifiable data, credentials, or protected health information (PHI) escapes the local trust boundary.
* **Payload Packaging**: Compressing, encrypting, and staging the bundle for delivery via the synchronization pipeline.

---

## 3. Diagnostic Bundle Specification

```
diagnostic_bundle_<correlation_id>.zip
├── bundle_manifest.json        <--- Bundle Identity & Versioning
├── summary.md                  <--- Investigation Report
├── MachineContext/
│   ├── host_inventory.json
│   └── environment_manifest.json
├── ApplicationContext/
│   ├── configuration_snapshot.json
│   └── database_snapshot.json
├── WorkflowContext/
│   ├── recent_domain_events.json
│   └── timeline.json
├── HealthContext/
│   ├── health_snapshot.json
│   └── worker_state.json
├── PerformanceContext/
│   └── performance_metrics.json
└── DiagnosticContext/
    ├── outbox_state.json
    ├── active_logs.txt
    └── crash_dump.dmp (Optional)
```

### Collection Triggers
The bundle is generated automatically or manually based on the following collection triggers:
* **Manual Support Ticket**: Initiated by a user reporting an issue.
* **Unhandled Exception**: Intercepted by the global process exception handlers.
* **Crash**: Triggered during process termination crash detection.
* **Failed OTA Update**: Triggered when a software upgrade fails verification or initiates a rollback.
* **Failed Backup**: Triggered when a scheduled database backup fails integrity or execution checks.
* **Repeated Background Worker Failure**: Triggered when a background worker crashes consecutively.
* **Excessive Outbox Failures**: Triggered when the message queue accumulates failed delivery attempts above a defined limit.
* **Manual Diagnostics Generation**: Triggered locally by a lab administrator.
* **Remote Middleware Command**: Instigated remotely by an operator command received during synchronization.

### Collection Strategy
When collection is triggered, the Diagnostics Service polls local subsystem providers and reads active file streams. To prevent performance degradation during clinical work, the collection process is bound to a low thread priority, and file access uses non-blocking read-sharing flags.

### Compression
* **Format**: Standard ZIP (deflate compression) to package multiple JSON files and log extracts into a single file.
* **Target Size**: Under 2 MB compressed (excluding crash dumps) to ensure it can be transmitted over weak network connections.

### Encryption
* **At Rest (Staged)**: Before transmission, the ZIP bundle is encrypted locally using AES-256-GCM.
* **Key Management**: Encrypted with a public key owned by the TBZ Middleware. The local SynOS instance cannot decrypt the bundle once wrapped, preventing tampering or exposure of stored diagnostics on the client machine.

### Upload Strategy
* The encrypted bundle is split into uniform binary chunks if it exceeds 5 MB.
* The chunks are indexed and queued in the `OutboxEvents` table, allowing the **Middleware Synchronization Worker** to stream the payload in the background.

### Privacy Boundary
To ensure compliance across multiple jurisdictions, the Diagnostics Service enforces strict data filters. 

**The Diagnostic Bundle must EXCLUDE:**
* **PII (Personally Identifiable Information)**: Client names, contact numbers, email addresses, MRNs, billing details, and physical addresses.
* **PHI (Protected Health Information)**: Exact clinical patient results, medical history summaries, or doctor-patient notes.
* **Credentials & Secrets**: Plain-text passwords, salt hashes, database connection strings containing credentials, active API secret keys.
* **Report PDFs**: Generated clinical PDF documents.
* **DICOM Images**: Raw imaging files or scans.
* **Scanned Documents**: Scanned prescriptions or identity papers.
* **Patient Photos**: Profile photos or identifier scans.
* **Digital Signatures**: Digital signature image files or signature templates.

---

## 4. Logical Telemetry Contexts (AI Consumption Design)

To allow any future AI model or engineer to consume the bundle without depending on SynOS internals, telemetry is organized into logical contexts instead of isolated, unstructured files.

### A. Core Manifest
* **`bundle_manifest.json`**: Provides identity and schema versioning for the bundle.
  ```json
  {
    "DiagnosticBundleId": "d748f572-88f2-4e4f-b677-83d463e2f5b4",
    "BundleVersion": "1.0.0",
    "SchemaVersion": "1.0",
    "GeneratedAt": "2026-07-06T11:15:30Z",
    "GeneratedBy": "SynOS v1.0.8",
    "CorrelationId": "9b0ae103-8cf7-47f1-a55c-eadb1ab1664a",
    "SupportTicketId": "ST-9034",
    "CrashId": null,
    "LabId": "KHAMMAM-MAIN-01"
  }
  ```

### B. MachineContext
Describes the physical host and deployment identity.
* **`host_inventory.json`**: OS version, CPU core count, total memory, disk partition space (free/total), network interfaces.
* **`environment_manifest.json`**: SynOS version, build number, build date, git commit identifier, .NET runtime version, Windows version, SQL Server version, list of installed/enabled modules, configuration flags, and active license version.

### C. ApplicationContext
Describes the configuration state and database metadata.
* **`configuration_snapshot.json`**: Active system variables, feature flag values, branch settings, and system-defined default reference ranges. Connection string credentials are replaced with `***`.
* **`database_snapshot.json`**: Active migration version, schema version, pending database migrations, database size on disk, table counts, largest tables by record count, and SQL database compatibility version.

### D. WorkflowContext
Provides historical operational context to reconstruct user and process sequences leading up to the issue.
* **`recent_domain_events.json`**: Holds the last 100–200 SynOS domain events (e.g. `PatientRegistered`, `BillCreated`, `PaymentReceived`, `SampleCollected`, `ProcessingStarted`, `ReportSigned`, `ReportDelivered`) with timestamps, correlation IDs, event names, and sanitized payloads (completely stripped of PII).
* **`timeline.json`**: A chronological list of significant operational events (e.g., `Application Started`, `Middleware Connected`, `Patient Registered`, `Bill Created`, `Unhandled Exception`, `Crash Dump Generated`) mapping timestamps directly to the operational pipeline.

### E. HealthContext
Monitors host load and background worker execution states.
* **`health_snapshot.json`**: CPU usage percent, memory commit size, local system uptime, database size on disk, and database connection pool status.
* **`worker_state.json`**: Status of all asynchronous background tasks (outbox sync, PDF spooler, print dispatcher) including: last execution time, execution duration, failure count, restart count, last exception message, and overall health state.

### F. PerformanceContext
Identifies system delays and resource consumption bottlenecks.
* **`performance_metrics.json`**: Tracks API response times, middleware synchronization duration, background worker execution durations, outbox retry latency, CPU trend data, memory trend data, and disk usage trends.

### G. DiagnosticContext
Contains raw diagnostic traces and logs for forensic debugging.
* **`outbox_state.json`**: Current count of `Pending`, `Failed`, and `DeadLetter` events in the transactional outbox queue, listing error codes of the last 10 failed event transmissions.
* **`active_logs.txt`**: The current day's active Serilog log file, truncated to the last 500 lines or the last 50 error/warning events, with PII redacted.
* **`crash_dump.dmp`**: A process minidump containing thread execution stacks, active registers, and exception context records (explicitly blocking full heap dumps that might contain PHI).

---

## 5. Automated LLM Diagnostics Design

To ensure the Diagnostic Bundle can be consumed directly by LLMs (such as GPT or Claude) for automated troubleshooting, the JSON telemetry files are constructed according to a unified schema optimized for token efficiency and semantic clarity.

### Unified Context Summary (`summary.md`)
A markdown file generated at the root of the bundle containing a clean synthesis of the error state, structured as an investigation report:

```markdown
# Investigation Summary

## System Identity
* **Lab ID**: KHAMMAM-MAIN-01
* **SynOS Version**: v1.0.8 (Build 2026.07.05)
* **OS & Runtime**: Windows Server 2022 / .NET 8.0

## Observed Problem
* **Trigger Type**: Unhandled Exception (Process crashed)
* **Trigger Event**: Signature failure on Report `6692b888-7b2c-48d4-86cd-04074421e22a`

## Timeline Summary
1. `2026-07-06T11:12:00Z` - Application Started
2. `2026-07-06T11:15:22Z` - Patient Registered (Correlation: `9b0ae103...`)
3. `2026-07-06T11:15:30Z` - Crash Event (NullReferenceException)

## Primary Exception
```
Object reference not set to an instance of an object (NullReferenceException)
   at SynOS.Services.ReportService.SignReportAsync(Guid reportId, Guid signedByUserId)
   at ...
```

## Operational Warnings
* WARNING: Local storage free space is below 10% (Free: 4.2 GB / 50 GB)
* Outbox Status: 1,402 Pending Sync Events (Sync Connection offline for 3h 12m)

## Probable Root Cause
* Report signature block failed to load due to missing Doctor signature template database relation for user `signedByUserId`.

## Suggested Investigation Order
1. Check if user roles database setup mapped user `signedByUserId` as active default signatory in `configuration_snapshot.json`.
2. Inspect `outbox_state.json` to verify the Middleware Synchronization Worker connection status.

## Bundle Completeness
* **JSON Snapshots**: 7 / 7 files present
* **Logs**: Redacted log stream included
* **Crash Dump**: Minidump attached (`DiagnosticContext/crash_dump.dmp`)
```

### AI Schema Principles
* **Token-Optimized Schemas**: Log patterns are aggregated (e.g., `[SqlException (42 occurrences) - Timeout]`) instead of printing identical traces repeatedly.
* **Self-Contained References**: The files avoid referencing external schemas, keys, or metadata definitions that would require the model to ask clarifying questions.
