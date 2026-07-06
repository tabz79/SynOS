# SynOS Remote Operations Foundation Specification

This document defines the architecture for remote monitoring, management, and support of the SynOS ecosystem. It leverages the existing three-tier architecture to operate every on-premise installation without requiring physical client site visits.

---

## 1. Vision & Architecture

The remote operations strategy is built directly upon the existing product architecture. It does not introduce new layers, agents, or runtimes. Instead, operations are executed entirely within the existing application boundaries:

```
+------------------------------------------+
|          TBZ Control Tower               |  <--- Operations Frontend
+------------------------------------------+
                     ↓
+------------------------------------------+
|            TBZ Middleware                |  <--- Central Backend (Brain of Operations)
+------------------------------------------+
                     ▲
                     | (Push Telemetry / Pull Commands)
+------------------------------------------+
|                SynOS                     |  <--- Local Lab Runtime (On-Premise Client)
+------------------------------------------+
```

### Core Architecture Goals
* **Zero-Visit Support**: Enable diagnostic collection, exception trace reporting, and state debugging from a central operations platform.
* **Continuous Operations**: Automate software updates, database schema migrations, and backup verification directly within the local runtime.
* **Proactive Monitoring**: Track on-premise hardware resource consumption and database health to anticipate issues before they disrupt lab operations.

---

## 2. Layer Responsibility Boundaries

To determine where any remote operational feature is implemented, apply the following architectural rule:
> **"Does this operation require direct access to the client's local machine or database?"**
> * **YES** $\rightarrow$ It belongs inside **SynOS** as a local service or background worker.
> * **NO** $\rightarrow$ It belongs in **TBZ Middleware** (Backend) or **TBZ Control Tower** (Frontend).

### A. SynOS Responsibilities (On-Premise Client)
SynOS runs the physical laboratory workflows. It hosts all background workers and services that require direct system, database, and local file access:

* **Support Telemetry & Ticket Submission**: Exposes user-facing triggers to generate tickets. It aggregates environment details (SynOS version, database version, RAM, CPU load, disk space) and packages them for upload.
* **Log & Diagnostic Bundle Generator**: Compiles log files, parses exceptions, and builds compressed diagnostic bundles.
* **Backup & Restore Service**: Executes scheduled database backups, verifies integrity local-side, performs recovery tests, and processes recovery actions.
* **Local Crash Detector**: Hooks into unhandled global exceptions to generate crash dumps and log process termination stack traces.
* **Update Installer**: Downloads OTA binaries, runs pre-installation backups, applies schema migration scripts, executes post-upgrade health checks, and initiates rollbacks if verification fails.
* **Feature Flag Cache**: Stores local feature flag configurations to ensure uninterrupted operations in offline or disconnected states.
* **Sync Engine**: Drives heartbeats and processes event outbox queues, pushing telemetry up to the Middleware and pulling commands/updates down.

### B. TBZ Middleware Responsibilities (Central Backend)
TBZ Middleware acts as the central coordinator and the "brain" of all remote operations. It owns the aggregated data store and exposes operational API interfaces:

* **Support Ticket & Diagnostic Repository**: Receives, registers, and tracks incoming support tickets and diagnostic bundles sent from on-premise instances.
* **Crash Report Hub**: Aggregates exception stack traces and storage locations of memory dumps.
* **OTA Release Manager**: Serves as the repository for all software releases, database migrations, and patches, controlling version distribution.
* **Feature Flag Master**: Holds the master configurations for feature toggles, handling rules for progressive rollouts.
* **Licensing Engine**: Manages activation codes, validates keys, tracks expirations, and binds machines.
* **Health & Telemetry Aggregator**: Tracks agent heartbeats, database growth patterns, resource consumption averages, and backup logs.
* **Remote Commands Orchestrator**: Enqueues system directives (e.g. "Trigger Immediate Backup", "Download Patch") to be pulled down by the client during synchronization.

### C. TBZ Control Tower Responsibilities (Operations UI)
TBZ Control Tower is the administrative interface built on top of the Middleware. It is used by developers and operations staff:

* **Global Labs Dashboard**: Displays the status, uptime, and versions of all active installations.
* **Health Monitor**: Graphically visualizes CPU, memory, and disk health metrics, highlighting installations exceeding resource thresholds.
* **Support Ticket Explorer**: Provides interfaces to read, prioritize, and reply to client tickets, with direct access to attached diagnostics.
* **Release & Update Center**: Controls targeting of software releases to specific labs, groups of labs, or globally.
* **License & Flag Manager**: Allows operators to activate features, toggle capability flags (e.g., WhatsApp delivery or AI features), and manage licenses.
* **Crash Console**: Monitors exception frequencies and patterns (similar to Sentry).

---

## 3. Operational Services Specification

### Support & Telemetry Service (Local to SynOS)
* **Purpose**: Collect diagnostics and submit issues.
* **Responsibilities**:
  - Aggregate machine context (CPU, memory, storage load) and SQL Schema versions.
  - Retrieve the last 100 lines of active logs from Serilog.
  - Package data and forward to the Sync Outbox.
* **Dependencies**: Local Log System, OS API.

### Health Telemetry Service (Local to SynOS)
* **Purpose**: Monitor local resource boundaries.
* **Responsibilities**:
  - Sample host metrics (RAM utilization, CPU spikes, free disk space).
  - Measure database size and outbox/notification queue backlogs.
  - Format telemetry payload for periodic heartbeat checks.
* **Dependencies**: OS API, Database Interceptor.

### Backup Manager (Local to SynOS)
* **Purpose**: Safeguard system database integrity.
* **Responsibilities**:
  - Run database dump tasks.
  - Zip and encrypt backup archives.
  - Validate generated archive integrity.
  - Manage retention policies.
* **Dependencies**: Database Engine, Encryption Module.

### Update Agent (Local to SynOS)
* **Purpose**: Apply remote upgrades.
* **Responsibilities**:
  - Retrieve binaries and verify checksums.
  - Perform rollback backups of binaries and database schema.
  - Run migration scripts.
  - Evaluate system health post-upgrade and execute automatic rollback on check failures.
* **Dependencies**: Service Manager, Database Migration Engine.

---

## 4. Guiding Principles

* **Lab Independence**: A failure in TBZ Middleware or TBZ Control Tower must never impact local clinical operations. SynOS must remain fully functional locally.
* **Telemetry is Outbound Only**: SynOS initiates all requests. It pushes telemetry and polls for command queues via the outbound connection, avoiding incoming firewall port openings.
* **Additivity**: Database updates must be additive. Migrations must be designed to avoid destructive structural updates so rollbacks can be performed without loss of local data.

---

## 5. Future Extensibility

To introduce new operational capabilities (e.g., "Billing Auditing" or "Device Interface Monitoring"):
1. **Define Local Collection**: Implement a local service inside **SynOS** to record metrics.
2. **Utilize Existing Sync**: Write data payloads into the existing transactional event outbox. No custom networking configuration is required.
3. **Expose in Middleware**: Register the new event type in the **TBZ Middleware** parser and add corresponding metrics panels in the **TBZ Control Tower** UI.
