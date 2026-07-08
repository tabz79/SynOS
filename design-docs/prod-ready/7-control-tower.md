# TBZ Control Tower Architecture Specification

This document defines the architectural specification for the TBZ Control Tower. Using the principles of @[design-docs/opx-foundation.md](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/design-docs/opx-foundation.md), this specification establishes the presentation, search, and remote command controls used by support and engineering teams to monitor and maintain the fleet of deployed SynOS installations.

---

## 1. Purpose

The TBZ Control Tower serves as the centralized user interface and operational dashboard used by engineering and support teams to manage, monitor, and diagnose the fleet of on-premise SynOS installations. 

It aggregates data visualizations, release management pipelines, support tickets, and remote command controls by consuming data streams exposed exclusively by the TBZ Middleware.

---

## 2. Dashboard Architecture

The Control Tower is organized into hierarchical functional dashboard sections:
* **Global Overview**: High-level aggregated fleet stats (online counts, critical alerts, pending updates, active tickets).
* **Incident Center**: Dashboard aggregating critical operational incidents affecting multiple laboratories simultaneously.
* **Lab Overview**: Grid index of all labs with real-time health badges and current versions.
* **Operations**: Central command console for executing single-lab or fleet-wide remote directives.
* **Support**: Interface for triage, reading ticket diagnostic summaries, grouping tickets under cases, and updating knowledge base rules.
* **Releases**: Configuration manager for target SemVer releases, database migration packages, and staged rollout rings.
* **Administration**: User access control, audit trails, and notification routing rules.

---

## 3. Major Operational Modules

* **Lab Inventory**: Directory listing of deployed SynOS hardware identities, branches, licenses, and module configurations.
* **Incident Center**: Aggregates and correlates data from Health, Support, Diagnostics, Releases, and Analytics to isolate fleet-wide issues such as version-specific crashes, widespread backup failures, release rollout failures, feature flag regressions, and infrastructure incidents.
* **Health Dashboard**: Real-time graphs showing CPU utilization, memory allocations, connection pools, and outbox backlogs.
* **Support Center**: Ticketing tracker illustrating priority levels, categories, and communication history.
* **Diagnostics Explorer**: Context viewer that decrypts and displays Diagnostic Bundles, showing logs, timeline context, and manifests.
* **Crash Center**: Grouped index of exception traces, minidumps, version occurrences, and affected instances.
* **Backup Monitor**: Audit log of GFS database backups, file sizes, verification records, and quarterly sandbox test restores.
* **Release Manager**: Dashboard for publishing releases, mapping dependencies, and managing staged ring rollouts.
* **Feature Flags**: Remote toggles to enable/disable specific SynOS modules (e.g. AI helpers, WhatsApp dispatch).
* **License Center**: Registry to issue, sign, and revoke active instance licenses.
* **Notifications**: Alert configuration rules (SMS, email, Webhook targets).
* **Audit Viewer**: Immutable log of operator activities and remote commands.
* **Analytics**: Observability dashboard displaying fleet-wide statistics (adoption rates, crash trends, performance bottlenecks).

---

## 4. Lab Details View

An individual lab's details screen provides a unified operational summary of the selected installation:
* **Version Profile**: Active SemVer application build, schema version, and pending updates.
* **Health Status**: Active CPU/memory load, free disk space, and synchronization worker heartbeat logs.
* **Installed Modules**: List of active and licensed packages (e.g. Core, Inventory, PACS, AI).
* **Recent Tickets**: Audit of open and recently closed support cases and tickets.
* **Backup Status**: Retention logs, storage tier locations, and last sandbox verification timestamp.
* **Diagnostics History**: List of generated Diagnostic Bundles available for download or analysis.
* **Last Heartbeat**: Accurate timestamp of the last heartbeat connection.
* **Feature Flags**: Active feature state matrix.
* **License Info**: Encryption parameters, activation parameters, and expiration thresholds.
* **Command History**: Log of sent remote commands and execution outcomes.
* **Fleet Timeline**: The primary chronological view of an installation's operational history. It presents a historical timeline of significant operational events:
  - Heartbeats and connection drops.
  - Software updates (deployments, verifications, rollbacks).
  - Backups executed (success, size, verification state).
  - Restore operations (pre-restore logs, verification audits).
  - Diagnostic Bundle Uploads.
  - Support Tickets created, submitted, or resolved.
  - Crash Events and stack trace triggers.
  - Feature Flag changes (remote toggle activations/deactivations).
  - License Refreshes.
  - Remote Commands scheduled or executed.

---

## 5. Remote Operations Control

The Control Tower schedules commands by writing to the TBZ Middleware Command Queue. Operations are separated into single-lab and fleet-wide controls:

### Single-Lab Operations
Commands executed against a specific local SynOS client:
* **Generate Diagnostic Bundle**: Requests SynOS to assemble, redact, and upload a new Diagnostic Bundle.
* **Request Health Snapshot**: Demands real-time system performance and connection statistics.
* **Schedule Backup**: Directs the local Backup Manager to execute an immediate database snapshot.
* **Restore Backup**: Instructs SynOS to execute a database recovery process from a specific backup ID (requires double authorization).
* **Deploy Update**: Schedules the Update Service to install a specified migration package.
* **Restart Background Worker**: Re-initializes specific background worker threads (e.g. print spooler).
* **Refresh Feature Flags**: Commands SynOS to reload its local feature flag cache.
* **Refresh License**: Directs SynOS to fetch the latest signed cryptographic license key.

### Fleet-Wide Operations
Commands targeted to run across multiple installations simultaneously (e.g., filtered by ring, region, or active software version):
* **Deploy Updates**: Pushes target version upgrades across rollout ring tiers.
* **Generate Diagnostics**: Demands diagnostic generation across a custom selected subset of labs.
* **Schedule Backups**: Triggers coordinated backup sequences across selected branches.
* **Refresh Licenses**: Forces license updates across a group of labs.
* **Refresh Feature Flags**: Deploys updated feature configurations to target installations.
* **Restart Workers**: Triggers background worker restarts across specific active software versions experiencing a known regression.

---

## 6. Global Search Capability

The search index queries the Middleware datastores across the following contexts:
* **Search Labs**: Queries by Lab ID, branch name, geography, version, or hardware ID.
* **Search Tickets**: Filters by category, priority, status, affected version, or description keywords.
* **Search Diagnostic Bundles**: Searches bundle manifests, timeline events, or redacted log extracts.
* **Search Crashes**: Identifies instances based on exception stack trace signatures or crash IDs.
* **Search Updates**: Audits updates by version, migration schema ID, or release date.
* **Search Versions**: Lists installations matching specific SemVer versions.
* **Search Knowledge Base**: Searches by known issues, fingerprints, or workarounds.

---

## 7. Aggregated Operational Views

* **Fleet Health**: Real-time timeseries showing active installations categorized by status (online, degraded, offline).
* **Update Rollout**: Visualizes release adoption rates across targeted canary and ring groups.
* **Backup Compliance**: Identifies installations violating GFS backup requirements or failing sandbox restores.
* **Crash Trends**: Chart of crash frequencies normalized against version deployment rates.
* **Performance Trends**: Maps API latency and PDF generation delays across different labs.
* **Ticket Trends**: Compiles incoming ticket statistics by category and priority to pinpoint systemic bugs.

---

## 8. Guiding Principles

* **Decoupled Connectivity**: The Control Tower never communicates directly with SynOS clients. All communication is routed through the TBZ Middleware's command and heartbeat queues.
* **Zero Data Ownership**: The Control Tower is a stateless visualization layer; it stores no operational logs, tickets, or client statistics. All operational data is owned and persisted by the TBZ Middleware.
* **Action Auditing**: Every remote command triggered from the Control Tower must log an immutable audit record in the Middleware database.
