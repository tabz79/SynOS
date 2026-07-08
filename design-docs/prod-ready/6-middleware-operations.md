# TBZ Middleware Operations Architecture Specification

This document defines the operational architecture of the TBZ Middleware. Using the principles of @[design-docs/opx-foundation.md](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/design-docs/opx-foundation.md), this specification establishes the Middleware as the centralized "Operations Brain" responsible for managing, monitoring, and updating every deployed SynOS installation.

---

## 1. Purpose

The TBZ Middleware serves as the centralized operations backend for the entire SynOS ecosystem. It is responsible for orchestrating remote telemetry collection, managing software releases, tracking licensing, evaluating health, executing the diagnostic analysis pipeline, and routing operational commands to all deployed on-premise SynOS installations.

---

## 2. Responsibilities of TBZ Middleware

TBZ Middleware coordinates operations through dedicated functional repositories and queues:

* **Lab Registry**: The single source of truth for all deployed SynOS installations, tracking their unique hardware tokens, names, geographical regions, active branches, and system parameters.
* **Health Repository**: Stores incoming heartbeat payloads, CPU/memory history, disk capacity trends, and queue backlog sizes.
* **Support Repository**: Manages the lifecycle of Support Tickets and consolidates them under Support Cases.
* **Diagnostics Repository**: Collects, decrypts, and indexes diagnostic bundles and system logs.
* **Release Repository**: Holds software release manifests, binary packages, and database migration bundles, regulating version mapping.
* **Backup Repository**: Catalogues historical database backups, sizes, verification records, and sandboxed test restore statuses.
* **Crash Repository**: Aggregates exception dump logs, minidumps, execution stacks, and crash frequencies.
* **Command Queue**: Stores pending, executed, and failed operational directives destined for specific SynOS instances.
* **Notification Center**: Routes alerts, backup failures, and critical system indicators to operators via notification dispatches.
* **License Repository**: Generates, signs, and audits cryptographic license keys and active branch limits.
* **Feature Flag Repository**: Manages active feature state matrices, enabling remote feature control.

---

## 3. Diagnostics Ingestion Processing Pipeline

When a Diagnostic Bundle is pushed from a SynOS instance via the local **Middleware Synchronization Worker**, the Middleware processes it through a strict, multi-stage ingestion pipeline:

```
[Receive Bundle] ──> [Validate Structure] ──> [Authenticate Sender] ──> [Authorize Upload] ──> [Verify Bundle Version] 
                                                                                                      │
[Forward to Analysis] <── [Index Bundle] <── [Parse Bundle] <── [Decrypt Bundle] <── [Verify Integrity] ◄┘
```

1. **Receive Bundle**: Ingests binary chunks or single archives over secure HTTPS streams.
2. **Validate Bundle Structure**: Inspects the package layout before allocating processing resources to ensure it is not corrupt or malformed.
3. **Authenticate Sender**: Verifies the installation's hardware identifier and access keys against the Lab Registry to prevent unauthorized inputs.
4. **Authorize Upload**: Validates that the active client license supports support ticketing, diagnostics collection, or is reacting to an active operations mandate.
5. **Verify Bundle Version**: Confirms the schema of the diagnostic files against the active Middleware intake parser versions.
6. **Verify Integrity (Checksum & Signature)**: Validates that the payload has not been modified in transit by checking cryptographic signatures.
7. **Decrypt Bundle**: Decrypts the archive using the Middleware's private operational key, ensuring diagnostics remain secure in transit.
8. **Parse Bundle**: Unpacks and translates files (e.g. `summary.md`, `host_inventory.json`, `timeline.json`) into structured memory objects.
9. **Index Bundle**: Extracts key metadata (such as log exception hashes, hardware info, and version markers) for rapid searching.
10. **Forward to Analysis Pipeline**: Dispatches the validated package to the central Analysis Pipeline for fingerprint matching and issue resolution.

---

## 4. The Operational Event Bus

To keep the Middleware modular, decoupled, and extensible, workflows are connected via a conceptual **Operational Event Bus**. Rather than tightly coupling repositories and database events, Middleware services publish and subscribe to discrete operational events:

### Event Flow Examples

#### Scenario A: Heartbeat Telemetry & Alerting
```
[Heartbeat Received] 
        │
        ▼
[Health Updated] 
        │
        ▼
[Threshold Exceeded] (Disk space < 10% or Worker Crash)
        │
        ▼
[Alert Generated] 
        │
        ▼
[Support Case Created] (Auto-logs operational Case)
        │
        ▼
[Notification Routed] ──> [Control Tower Updated]
```

#### Scenario B: Diagnostic Processing & Auto-remediation
```
[Diagnostic Bundle Received] 
        │
        ▼
[Fingerprint Generated] (Stack trace hash computed)
        │
        ▼
[Known Issue Match] (Matches Knowledge Base fingerprint)
        │
        ▼
[Resolution Package Suggested] (Config patch identified)
        │
        ▼
[Support Ticket Updated] ──> [Operator Notified]
```

---

## 5. Middleware-Owned Workflows

* **Health Evaluation**: Reacts to `Heartbeat Received` events. Evaluates memory leaks, thread locks, disk space, and synchronization worker queues. If parameters violate SLA thresholds, it publishes a `Threshold Exceeded` event.
* **Alert Generation**: Subscribes to `Threshold Exceeded` events, generating alerts and routing them to external messaging clients via the Notification Center.
* **Known Issue Matching**: Analyzes incoming ticket diagnostics against the Knowledge Base. Matches exception traces and log signatures to recommend existing fix packages or link to active Cases before manual escalation.
* **Release Eligibility**: Calculates update availability for each lab. Evaluates dependencies (e.g., minimum database schema requirements, OS support) and staged rollout target rules (canary vs. ring group) to declare if a lab is eligible to download an update.
* **Command Dispatch**: Controls delivery of commands. When a Control Tower operator schedules a command, it is queued. On sync heartbeat, the Middleware signs the payload and delivers it down to SynOS.
* **Notification Routing**: Evaluates alert categories and priority to dispatch alerts to appropriate groups (e.g. database failure alerts routed to database administrators; critical application crashes to developers).

---

## 6. Operations Analytics (Architectural Capability)

Operations Analytics is designed as an architectural capability that aggregates operational metrics across all installations to provide fleet-wide observability:

* **Fleet Health**: Real-time ratio of online, degraded, and offline SynOS installations.
* **Release Adoption & Success**: Percentage of labs running specific SemVer versions and the ratio of successful updates to update rollback events.
* **Backup Compliance**: Percentage of installations with verified backups within their retention window, highlighting backup failure trends.
* **Crash Frequency**: Aggregated crashes per version, identifying regressions in newly deployed builds.
* **Top Ticket Categories**: Classification counts of incoming tickets to identify recurring system pain points (e.g. printer spooler lockouts).
* **Common Diagnostic Fingerprints**: High-frequency stack trace patterns indicating common codebase bugs.
* **Performance Outliers**: Identification of lab instances experiencing database bloating or high latency times.
* **Sync Integrity**: Operational speed and data transmission success rates of the local Middleware Synchronization Workers.
* **Feature Flag Adoption**: Tracking which features are active across different rollout rings.

---

## 7. Core Data Ownership

TBZ Middleware maintains authority over the following operational history datastores:

* **Lab Identity**: Lab credentials, branch counts, licensed modules, and hardware profile signatures.
* **Operational History**: Log of update approvals, manual command executions, and administrator activities.
* **Health History**: Timeseries data of host specs, database growths, and queue depths.
* **Release History**: Registry of released versions, dependency structures, and migration scripts.
* **Backup History**: GFS tracking, checksum logs, and quarterly sandbox restore execution outcomes.
* **Crash History**: Exception fingerprints, minidump file metadata, and crash correlation indexes.
* **Support History**: Audit logs of ticket states, diagnostic bundle linkages, Case associations, and resolutions.

---

## 8. Communication with Control Tower

The TBZ Control Tower functions as a presentation layer over the TBZ Middleware. The Middleware exposes data to the Control Tower through the following integration models:

* **Real-Time Telemetry Streaming**: Middleware streams active heartbeat changes, outbox sync events, and alerts via high-throughput web sockets to ensure the Control Tower console is in sync.
* **Query API Integration**: Control Tower queries the Middleware repositories to filter labs, explore tickets, parse log bundles, audit database snapshots, and target releases.
* **Command Dispatching**: When operators interact with the Control Tower, actions are posted to the Middleware Command Queue.
* **Webhooks & Notification Dispatches**: Integrations dispatch events to notification clients or developer ticketing platforms.
