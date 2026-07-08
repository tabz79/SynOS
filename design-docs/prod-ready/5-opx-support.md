# Support Platform Architecture Specification

This document defines the architectural specification for the Support Platform within SynOS. Using the principles of @[design-docs/opx-foundation.md](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/design-docs/opx-foundation.md), this document details the ticket and case lifecycles, automated telemetry collection, analysis pipelines, knowledge base design, and remote resolution workflows.

---

## 1. Purpose

The Support Platform orchestrates ticket logging, case management, diagnostic dispatching, and remote resolution pipelines between SynOS instances and the TBZ Control Tower via the TBZ Middleware. 

It enables operators to identify, debug, and resolve local on-premise installation issues, combining manual user reporting with automated crash telemetry and diagnostic bundles.

---

## 2. Ticket & Case Lifecycles

### Support Tickets (SynOS Local)
Support tickets represent individual incident reports originating from specific SynOS instances. They track the local lifecycle of an issue from generation to verification.

```
[Automatic Trigger / Manual Input] 
                │
                ▼
           [Created] (Local state on SynOS Client)
                │
                ▼
           [Queued] (Staged locally in outbox)
                │
                ▼
          [Uploading] (Transmitting chunked bundle payload)
                │
                ▼ (Sync via Middleware Synchronization Worker)
     [Submitted / Acknowledged] (Registered in TBZ Middleware)
                │
                ▼ (Analysis Pipeline Intake & Fingerprint Match)
          [In Analysis] ─────── Link to Case ──────┐
                │                                 │
         ┌──────┴──────────────────────┐          ▼
  [Escalated]                 [Waiting for Update] ──> [Support Case] (Middleware)
         │                             │
         └─────────────────────────────┼──────────────────────┘
                                       ▼
                                  [Verified]
                                       │
                                       ▼
                                    [Closed]
```

### Support Cases (TBZ Middleware Central)
A **Support Case** is an operational entity owned and managed entirely by the TBZ Middleware. 
* **One-to-Many Linking**: Multiple Support Tickets originating from different SynOS installations can be linked to a single Support Case when they share the same diagnostic fingerprint or represent the same underlying software defect.
* **Engineering Tracking**: Engineering teams work on Cases rather than individual Tickets. When a Case is marked resolved (e.g., via a deployed software update), all linked Tickets transition to the `Waiting For Update` or `Verified` states.

---

## 3. Ticket Classifications (Priority & Category)

Tickets are classified upon creation to ensure appropriate SLA and routing rules are applied:

### Ticket Priority Classifications
* **Critical**: System-wide failures blocking patient care (e.g., database corruption, complete crash of core billing or reporting workflows).
* **High**: Restricts major operations without a local workaround (e.g., WhatsApp delivery failures, barcode printing queue blockages).
* **Medium**: Functional anomalies with active workarounds (e.g., single analyzer interface timeout, non-critical inventory warnings).
* **Low**: Minor user interface or optimization requests.

### Ticket Categories
* **Installation**: Deployment environment or initial setup issues.
* **Updates**: OTA deployment or database schema migration failures.
* **Backup**: Failure of database snapshots, integrity validations, or GFS retention policies.
* **Performance**: Slow API responses, database timeouts, or background worker delays.
* **Crash**: Unhandled application exceptions and process termination events.
* **Printing**: Local thermal/A4 printer configurations and spooler errors.
* **Analyzer**: Diagnostic hardware interface connectivity.
* **Inventory**: Stock count tracking and lot expiry configurations.
* **Security**: Authentication, authorization, or encryption errors.
* **General**: General support and usability queries.

---

## 4. Ticket Generation & Data Collection

### Manual Tickets
* **Trigger**: Initiated by a lab user clicking the "Report Issue" button in the SynOS UI.
* **Context**: The user provides a textual description of the problem.
* **Payload**: SynOS automatically compiles a Diagnostic Bundle, attaches the user description, and queues the payload for transmission.

### Automatic Ticket Creation
* **Trigger**: Triggered by local system boundary events (e.g. storage space <10%, local database backup failures, background worker loop timeouts).
* **Payload**: Includes error logs, specific trigger metadata, and a target Diagnostic Bundle.

### Crash Tickets
* **Trigger**: Intercepted by unhandled application exception handlers prior to process exit.
* **Context**: Designed for execution failure tracking.
* **Payload**: Automatically generates a minidump (`crash_dump.dmp`) and packages it with the environment manifest, Serilog errors, and execution timeline, bypassing standard staging queues for immediate push.

### Screenshot Policy
* **Sanitization Invariant**: When a manual ticket is generated, the user can opt to capture the active SynOS screen. Screenshots containing sensitive clinical or personal information (PII/PHI) must be sanitized and redacted locally before transmission.

---

## 5. Middleware Integration & Communication

* **Asynchronous Outbox Sync**: All tickets, manifests, and diagnostic archives are logged transactionally in the local database and synced to the TBZ Middleware via the **Middleware Synchronization Worker**.
* **Chunked Upload Pipeline**: To ensure reliability on poor internet connections, large diagnostic attachments are broken into 1 MB chunks, verified by SHA-256 hashes, and reassembled by the Middleware.

---

## 6. Analysis Pipeline, Knowledge Base & Remote Resolution

### Central Analysis Pipeline
Before ticket escalation, the TBZ Middleware routes the ticket through a technology-neutral **Analysis Pipeline** (which can be implemented via a Rule Engine, AI models, or a human triage engineer):
1. **Intake & Extraction**: The pipeline extracts the `bundle_manifest.json` and `summary.md` from the Diagnostic Bundle.
2. **Fingerprint Assessment**: The pipeline consults the **Knowledge Base** to check if the diagnostic fingerprint matches a registered known issue.
3. **Automated Triage**:
   - **Match Found**: The ticket is linked to the existing Support Case. If a workaround or automated resolution package is available, it is applied directly.
   - **No Match Found**: The pipeline creates a new Support Case on the Middleware and escalates the ticket to the Control Tower for engineering analysis.

### Operational Knowledge Base
The Knowledge Base is a first-class operational repository stored on the Middleware. It contains structured records representing verified issues:
* **Known Issue**: Semantic name and description of the defect.
* **Diagnostic Fingerprint**: Unique signature (compiled from stack trace hashes, error codes, logs, and configuration flags) used to match incoming tickets.
* **Root Cause**: Architectural or system failure description.
* **Workaround**: Manual or configuration-based bypass instructions for operators.
* **Fixed Version**: The target SemVer software release containing the permanent fix.
* **Affected Versions**: SemVer ranges of installations vulnerable to the defect.
* **Resolution Package**: The target configuration patch, feature flag toggle, or migration update package used to resolve the issue.

### Remote Command Categories
Remote commands pushed from the Control Tower to SynOS are categorized by risk level:
* **Safe**: Read-only queries (e.g., retrieving configuration files, running diagnostic tests). No approval required.
* **Administrative**: Adjusting configuration flags or feature states. Requires local administrator confirmation or logging.
* **Recovery**: Rebuilding indices, clearing spoolers, or executing a database snapshot validation. Requires operator notification.
* **Restricted**: Destructive actions (e.g., restoring a database backup, triggering a software rollback). Requires strict double authorization (Control Tower operator plus local lab administrator).

### Resolution Package
The output of an investigation in the Analysis Pipeline results in a defined **Resolution Package**:
* **Configuration Change**: Remotely adjusting environment settings.
* **Feature Flag**: Disabling a degraded feature using remote feature toggles.
* **OTA Update**: Deploying a target patch or version release.
* **Knowledge Base**: Pushing user-facing guidance to resolve operational issues.
* **Manual Procedure**: Issuing step-by-step instructions for local administrators.

---

## 7. Support & Update Integration

Confirmed software defects identified during support ticket analysis transition directly into the software release cycle:

```
[Ticket Created] ──> [Link to Case] ──> [Engineering Fix] ──> [Release Published] ──> [OTA Deployment] ──> [Verification] ──> [Closure]
```

1. **Ticket Created**: The defect is reported and categorized.
2. **Link to Case**: The ticket is linked to a Middleware Support Case (new or existing).
3. **Engineering Fix**: Developers resolve the bug based on diagnostic traces.
4. **Release Published**: A new software release containing the fix is published.
5. **OTA Deployment**: SynOS downloads and installs the patch during the scheduled maintenance window.
6. **Verification**: Post-update verification checks confirm the issue is resolved and the system is healthy.
7. **Closure**: The support ticket and its parent Case are closed.

---

## 8. Engineering Feedback Loop

Support cases feed the product development lifecycle to improve system robustness and document solutions:

```
[Support Ticket] ──> [Linked Case] ──> [Engineering Work] ──> [Release] ──> [Deployment] ──> [Verification] ──> [Knowledge Base Update]
```

Information gathered during the investigation of a Case is compiled to update the central **Knowledge Base**, allowing the Analysis Pipeline to automatically resolve similar issues in the future.
