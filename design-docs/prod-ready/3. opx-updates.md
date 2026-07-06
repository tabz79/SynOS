# Update Service Architecture Specification

This document defines the architectural specification for the Update Service within SynOS. Using the principles of @[design-docs/opx-foundation.md](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/design-docs/opx-foundation.md), this document details the release pipeline, database migrations, security verification, and rollback recovery mechanisms.

---

## 1. Purpose

The Update Service is the local service running within SynOS responsible for executing over-the-air (OTA) software updates, database schema migrations, and version verification. 

It ensures that deployed on-premise installations can be kept up-to-date with releases managed by the TBZ Control Tower, with robust safeguards including automated backups and transaction-safe rollbacks on failure.

---

## 2. Release Pipeline, Policies & Approval Modes

### Release Pipeline Flow
```
[TBZ Control Tower] ──Publish Release──> [TBZ Middleware]
                                                │
                                    (Polling & Sync Heartbeat)
                                                ▼
                                         [SynOS Client]
                                                │
                                    1. Download Release Manifest
                                    2. Validate Checksum & Signature
                                    3. Schedule Maintenance Window
                                    4. Take Database/Binary Backup
                                    5. Apply Migrations & Binaries
                                    6. Execute Health Validation
                                    7. Commit Update OR Trigger Rollback
```

### Staged Rollout
The TBZ Middleware regulates updates via progressive rollouts configured in the Control Tower. Rollouts are targeted based on:
* **Canary Phase**: Deployed to a single developer/internal branch or a small test site.
* **Tiered Ring Phase**: Deployed sequentially to groups of labs (e.g., Ring 1: 5 labs, Ring 2: 20 labs, Ring 3: General Availability).
* **Rollout Targets**: Filters based on geographical region, active license tier, or compatibility parameters.

### Release Policies
Updates are classified under specific policy types that dictate update enforcement behavior:
* **Security Hotfix**: Immediately downloaded and queued for installation. Maintenance windows are bypassed or shortened, and local administrators are notified of mandatory deployment.
* **Feature Release**: Contains new functionality or modules. Downloaded in the background; installation is optional or scheduled by the local administrator.
* **Optional Update**: Non-critical bug fixes or optimizations. Downloaded only upon manual request or administrator approval.
* **Mandatory Update**: Critical updates required to maintain compatibility with TBZ Middleware sync APIs. Must be applied within a defined grace period before sync functionality is restricted.
* **Long-Term Support (LTS)**: Stable, highly tested release branches that receive only security and critical hotfixes, bypassing standard feature release rings.

### Update Approval Modes
* **Automatic**: SynOS automatically downloads, schedules, and installs updates when a maintenance window opens.
* **Administrator Approval**: SynOS notifies local administrators of an available update; download and installation require manual authorization via the local admin console.
* **TBZ Managed**: The deployment schedule is pushed directly from the TBZ Control Tower to target specific instances remotely.
* **Emergency Override**: Bypasses local approvals and scheduling checks for critical security hotfixes.

---

## 3. Versioning, Module Compatibility & History

### Versioning Scheme
* **Semantic Versioning (SemVer 2.0)**: Releases follow the `MAJOR.MINOR.PATCH` schema (e.g., `v1.2.0`).
* **Database Versioning**: Schema versions track sequential integer migrations (e.g., Migration #48), separate from binary updates, managed by Entity Framework Core migrations.

### Module Compatibility
The update manifest specifies compatibility constraints at both the system and individual module levels:
* **Core**: Core framework and database schema.
* **Inventory**: Stock tracking and lot management.
* **WhatsApp**: Patient notification dispatch queues.
* **Radiology**: PACS integrations and worklists.
* **AI**: Report interpretation templates and summary helpers.
* **Analyzer Interfaces**: Serial and TCP hardware connectivity modules.

### Update History
The Update Service maintains a local log of all update attempts to track lifecycle events:
* **Installed**: Successful updates committed to the system.
* **Failed**: Updates that failed preflight or execution, logging specific failure codes.
* **Rolled Back**: Installations that failed health checks post-upgrade and were reverted to the previous version.
* **Skipped**: Updates bypassed due to newer releases superseding them.
* **Cancelled**: Updates manually terminated by an administrator prior to execution.

---

## 4. Release Manifest Design

Every update package contains a structured, signed JSON manifest (`release_manifest.json`) at its root. It outlines prerequisites and target payloads using architecture-neutral execution instructions:

```json
{
  "ReleaseId": "f782390a-1123-45d2-a7d0-128a8d11ef30",
  "Version": "1.2.0",
  "SchemaVersion": "48",
  "ReleasedAt": "2026-07-06T12:00:00Z",
  "TargetArchitecture": "x64",
  "Prerequisites": {
    "MinDotNetVersion": "8.0",
    "MinWindowsVersion": "10.0.19041",
    "MinSqlVersion": "15.0",
    "RequiredFreeSpaceBytes": 5368709120
  },
  "ModuleCompatibility": {
    "Core": ">=1.1.0",
    "Inventory": ">=1.0.2",
    "WhatsApp": ">=2.0.0",
    "Radiology": ">=1.0.0",
    "AI": ">=1.0.0",
    "AnalyzerInterfaces": ">=1.1.5"
  },
  "Payloads": [
    {
      "FilePath": "bin/SynOS.Api.dll",
      "Type": "BinaryAssembly",
      "Action": "Deploy",
      "ChecksumSHA256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    {
      "FilePath": "migrations/v48_add_audit_logs.pkg",
      "Type": "MigrationPackage",
      "Action": "ApplySchemaMigration",
      "ChecksumSHA256": "ca53a002bc92194ca43b1abcf928d3ef721a921d6302484920a921dbca52481a"
    }
  ],
  "Signature": "MEQCIFz/qV3G4l...[ECDSA-P256-SHA256 Signature]"
}
```

---

## 5. Download, Preflight Validation & Verification

### Download Lifecycle
* SynOS queries the Middleware via the **Middleware Synchronization Worker** for available releases matching its hardware and current version.
* Payloads are downloaded over HTTPS.

### Cryptographic Signatures
* **Signing Key**: Update payloads and manifests are signed by the development team's private ECDSA-P256 key before being uploaded to TBZ Middleware.
* **Verification**: The local Update Service inside SynOS verifies the manifest signature against a public key hardcoded in the local application assembly before executing any installation steps. This prevents man-in-the-middle vector attacks.

### Preflight Validation
Before a download or installation begins, the Update Service executes a suite of preflight checks:
* **Disk Space**: Confirms local storage meets manifest free space prerequisites.
* **Operating System**: Verifies OS version compatibility.
* **Runtime Verification**: Checks local .NET runtime and SQL Server engine versions.
* **License Validity**: Confirms the active license key is valid and not expired.
* **Middleware Connectivity**: Validates connection stability to the TBZ Middleware.
* **Backup Location**: Checks write permissions and storage limits at the target database backup location.
* **Pending Restart Detection**: Identifies if the host OS has a pending reboot flag, deferring updates to prevent corruption.

---

## 6. Update Execution Lifecycle

### Maintenance Window Constraints
An update execution will only initiate when specific maintenance conditions are met:
* **No Active Billing**: No patient registration or billing invoice creation in progress.
* **No Report Signing**: No clinicians actively signing or verifying reports.
* **No Sample Collection**: No phlebotomy collection entries actively being recorded.
* **No Active Print Jobs**: Spooler queues must be empty.
* **No Critical Background Workers**: Background workflows must be in an idle state.

* **Deferral Strategy**: If these conditions are not met, the update is deferred for a configured duration (e.g., 30 minutes) and re-evaluated. If mandatory updates cannot find a natural maintenance window within 48 hours, an administrator is prompted to schedule a forced window.

### 1. Backup Before Update
Before applying changes, the local Update Service triggers the local **Backup Manager**:
* **Database Snapshot**: Generates a full copy of the SQL database.
* **Binary Snapshot**: Backs up current executing assemblies and configuration files to a local `rollback/` staging directory.

### 2. Migration Execution
* **Service Suspension**: Suspends local background processing queues (e.g. printing, WhatsApp delivery).
* **Migration Package Application**: Runs migration packages transactionally.
* **Assembly Replacement**: Swaps file assemblies.

### 3. Post-Update Verification & Healthy Check
After migrations and assembly swaps complete, the Update Service runs the following verification routine:
* Verifies DB connection and confirms database migration tables match expected schema version.
* Exercises background worker execution loops (dry runs).
* **Generate Diagnostic Bundle**: Automatically triggers the local Diagnostics Service to build a diagnostic bundle containing post-update system health logs.
* **Notify Middleware**: Uploads health verification details and logs to the TBZ Middleware.
* **Mark Healthy**: If verification succeeds, the local installation is flagged as healthy, and the update is committed.

### 4. Rollback Rules
* **Rollback Supported**: Standard updates where database migrations are additive or schema-compatible can be reverted automatically using cached binaries and database migration rollbacks.
* **Rollback Not Supported**: Destructive database migrations (e.g., table drops or data conversions) that cannot be safely reversed schema-wise.
* **Mandatory Database Restore**: If a rollback-unsupported update fails post-upgrade verification, the Update Service executes a full database restore from the pre-upgrade snapshot to recover the system.

---

## 7. User Notification Lifecycle

The local user interface guides operators through the update lifecycle using a non-intrusive step-by-step notification flow:

```
[Update Available] ──> [Downloaded] ──> [Scheduled] ──> [Installing] ──> [Restart Required] ──> [Completed]
```

1. **Update Available**: A banner notifies administrators that a new update exists.
2. **Downloaded**: Indicates the update has passed preflight validation, downloaded successfully, and is staged.
3. **Scheduled**: Confirms the date and time when the update maintenance window is set to open.
4. **Installing**: Prompts users that system maintenance is active and services are temporarily suspended.
5. **Restart Required**: Notifies administrators to restart the application host process to complete assembly loading.
6. **Completed**: Displays a confirmation message detailing the new version number and updated modules.

---

## 8. Operational Optimization & Offline Labs

### Bandwidth Optimization & Delta Updates
* **Delta Packages**: Instead of downloading the full app release (e.g. 50 MB), the service downloads a binary diff containing only modified file chunks and migrations.
* **Thread-Bound Downloads**: Restricts download bandwidth during peak business hours (e.g. 8 AM to 8 PM) to avoid throttling active lab operations.

### Offline Labs
For sites running behind strict firewalls or experiencing extended internet disconnects:
* The Update Service supports **USB/Offline Package Installation**.
* A signed zip archive containing the update manifest, binaries, and SQL scripts can be manually imported via the local admin console.
* The Update Service executes the exact same signature verification, backup, and health check validation steps before applying the offline package.
