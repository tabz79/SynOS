# Backup & Recovery Service Architecture Specification

This document defines the architectural specification for the Backup & Recovery Service within SynOS. Using the principles of @[design-docs/opx-foundation.md](file:///d:/Projects/SynOS-Synthesized-Lab-Intelligence/design-docs/opx-foundation.md), this document details the backup scoping, encryption, compression, retention rotation, verification checks, and disaster recovery execution rules.

---

## 1. Purpose & Recovery Objectives

The Backup & Recovery Service is the local service running within SynOS responsible for executing scheduled database and asset backups, verifying backup archive integrity, conducting recovery tests, and executing disaster recovery procedures. 

It ensures database and file-level durability, protecting local diagnostics lab data from hardware failure or corruption, while exposing status statistics to the TBZ Middleware for centralized remote monitoring.

### Recovery Objectives
These parameters define the architectural targets for future implementation:
* **Recovery Point Objective (RPO)**: Target of less than 1 hour for database transactions, and less than 24 hours for media assets. No more than 1 hour of patient and results entry data should be lost in a disaster scenario.
* **Recovery Time Objective (RTO)**: Target of less than 2 hours to restore core laboratory operations (patient registration and result entry) following host hardware replacement.

---

## 2. Backup Types, Consistency & Manifest

To ensure complete recovery, backups are categorized and scoped based on data variability and structure:

* **Database Backup**: Copy of the SQL database schema and transactional tables (patients, visits, invoicing, result parameters, worker status records). Excludes volatile local log streams.
* **Reports Backup**: Exports generated final report structures and PDF binaries compiled by the reporting engine.
* **Configuration Backup**: Captures local device connection definitions, printer alignments, default reference ranges, and site profiles.
* **Media Backup**: Archives uploaded assets such as branding logos, signature image files, and scans.

### Backup Consistency Invariant
Backups must be **transactionally consistent**. Conceptual database snapshots are captured when no active write transactions are pending, ensuring the database state can be restored cleanly without partially written tables or orphan records.

### Backup Manifest (`backup_manifest.json`)
Every backup package contains a structured, metadata manifest at its root:

```json
{
  "BackupId": "b832a893-9c88-4f2d-83b0-2bca935e4d21",
  "BackupVersion": "1.0",
  "GeneratedAt": "2026-07-06T12:00:00Z",
  "GeneratedBy": "SynOS v1.0.8",
  "BackupType": "Full",
  "DatabaseVersion": "SQL Server 2019",
  "SchemaVersion": "48",
  "EncryptionVersion": "AES-256-CBC-v1",
  "Checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "LabId": "KHAMMAM-MAIN-01",
  "BundleContents": [
    "database_snapshot.bak",
    "configurations.json",
    "media/"
  ]
}
```

---

## 3. Storage Tiers, Encryption & Compression

### Backup Storage Tiers
To ensure durability, backups are stored across tiered storage boundaries:
* **Local Storage**: Retained on the local host drive for immediate, low-latency rollbacks and restores (RTO minimization).
* **External Drive (USB)**: Backed up locally to attached removable media to safeguard against local drive failures.
* **NAS (Network Attached Storage)**: Retained on the local area network to ensure redundancy against total host machine failure.
* **Future Cloud Storage**: Uploaded to secure offsite cloud storage endpoints configured via the TBZ Middleware for long-term disaster recovery.

### Compression
* **Format**: Standard ZIP or GZIP format with high-level deflate compression applied to configurations and reports, and optimized delta packing for SQL database snapshots.
* **Target Storage Efficiency**: Daily incremental diffs combined with weekly full database backups.

### Encryption
* **At Rest**: Backup files are encrypted locally using AES-256-CBC.
* **Key Management**: Encrypted using a client-specific key derived from a machine-bound hardware identifier combined with a master seed securely stored in the local configuration store.
* **In-Transit**: Remote backups streamed to external/cloud endpoints are transmitted via TLS 1.3.

---

## 4. Retention, Verification & Business Continuity

### Retention Policies
Backups follow a grandfather-father-son (GFS) retention rotation strategy:
* **Hourly Backups**: Retained locally for 24 hours.
* **Daily Backups**: Retained locally for 7 days, and uploaded externally.
* **Weekly Backups**: Retained locally for 4 weeks, and uploaded externally.
* **Monthly Backups**: Retained for 12 months.
* **Yearly Backups**: Retained permanently in cold storage archives.

### Verification Strategy
Before confirming a backup as successful, the Backup Service executes a multi-point verification check:
* **Checksum Verification**: Generates a SHA-256 hash of the output archive and logs it in the manifest.
* **Decompression Test**: Executes a dry decompress check on the zip structure to confirm zero corruption.
* **Metadata Checksum**: Validates the internal file records list against expected tables.

### Business Continuity Principles
* **Workflows Interruption Prohibited**: A backup failure or backup execution slowdown must never block or interrupt active laboratory workflows.
* **Alerting & Automatic Retries**: Failed backup attempts must trigger diagnostic alerts and schedule automated retry intervals at off-peak hours.
* **Resilient Patient Care**: Patient registration, sample collections, and reports generation must continue even if the backup storage layer is degraded or offline.

---

## 5. Recovery, Restore Validation & Audit Trail

### Restore Operations
The restore lifecycle requires strict isolation:
1. **Service Interruption**: SynOS enters a maintenance/lockdown state; active database connections are terminated, and background workers are suspended.
2. **Pre-Restore Snapshot**: Takes an emergency snapshot of the current corrupt state before performing any modifications.
3. **Extraction & Decryption**: Validates the backup key, decrypts the archive, and extracts schema/database binary files.
4. **Schema Re-alignment**: Restores SQL database files and executes database migrations to align with the current SynOS software version if upgrading/reverting.
5. **Worker Resumption**: Verifies database connection pool and restarts background workers.

### Restore Validation Phase
After a restore completes, and before the system is returned to active production, the Update Service and Backup Manager verify system consistency:
* **Database Integrity**: Checks database tables for consistency and schema errors.
* **Migration Version**: Verifies database migration markers match the expected software version.
* **Configuration Verification**: Assures local system parameters are populated.
* **License Check**: Assures the license key matches host hardware parameters.
* **Feature Flags**: Verifies feature flags are active.
* **Background Workers**: Validates that worker threads initialize and run correctly.
* **Middleware Synchronization**: Checks connection loops to the TBZ Middleware.
* **Health Commit**: The installation is marked healthy and production operations are resumed only after all validation steps pass.

### Recovery Audit Trail
Every restore operation creates an immutable audit record logged locally and synchronized with the TBZ Middleware:
* `RestoreId`: Unique tracking GUID.
* `BackupId`: The backup file identifier utilized.
* `InitiatedBy`: The administrator user ID who authorized the recovery.
* `Timestamp`: Time of execution.
* `Reason`: The diagnostic trigger for recovery (e.g. database corruption, rollback).
* `Duration`: Total time taken to complete the restore.
* `VerificationResult`: Pass/Fail status of the Post-Restore Validation phase.

### Test Restore (Sandboxed Verification)
To guarantee the recovery pipeline actually works, the Backup Service conducts periodic automated **Test Restores**:
* Runs on a quarterly schedule.
* Restores the database backup into an isolated, temporary SQL instance (sandbox).
* Executes a suite of verification queries.
* Logs the Test Restore results (Success/Failure, duration, validation status) in the backup logs table.

---

## 6. Disaster Recovery (DR) Scenarios

The Disaster Recovery plan establishes procedures for specific failure vectors:

### A. Disk Failure
* **Failure**: System drive fails, corrupting both database and configuration files.
* **Recovery**: Boot from secondary network storage, replace the drive, download configuration metadata and weekly/daily backups from NAS or Cloud storage tiers, and apply database restoring steps.

### B. Database Corruption
* **Failure**: Database engine encounters invalid files or corruption flags.
* **Recovery**: Lock SynOS service queues, isolate corrupted DB files, fetch the last verified hourly/daily backup, restore database consistency, and run catch-up synchronization via the **Middleware Synchronization Worker**.

### C. Accidental Deletion
* **Failure**: Critical files or configuration mappings are accidentally deleted by host processes.
* **Recovery**: Reconstruct parameters using the configuration and settings files restored from the hourly backup snapshots.

### D. Failed OTA Update
* **Failure**: Database migrations fail during a software upgrade or post-update checks fail.
* **Recovery**: Trigger automatic rollback. Stop SynOS services, revert binaries using the binary snapshot directories, restore database schema configurations, and alert Middleware.

### E. Power Loss During Update
* **Failure**: Power failure during migration execution leaves the database in an inconsistent state.
* **Recovery**: Upon boot, the Update Service detects the interrupted state flag, stops services, restores the database from the pre-upgrade snapshot backup, and rolls back the binaries.

### F. Operating System Corruption
* **Failure**: The host OS fails to boot or encounters critical boot failures.
* **Recovery**: Re-provision the OS, install a clean SynOS instance, apply the license token to pull configurations from TBZ Middleware, and download the daily backup from NAS/Cloud storage to restore operations.

---

## 7. Remote Backup Monitoring & Health

### Telemetry Sync
The Backup Service records all activities in the local database and shares execution summaries during the heartbeat sync:
* **Backup Logs**: Each run records: `BackupId`, `Timestamp`, `SizeInBytes`, `BackupType` (Full, Incremental), `VerificationStatus` (Passed, Failed), and `StorageDestination` (Local, External).
* **Sync Frequency**: Health metrics are transmitted to the TBZ Middleware on every connection loop via the **Middleware Synchronization Worker**.

### Backup Health Alerts
The TBZ Middleware evaluates backup stats and triggers high-severity alerts to the TBZ Control Tower if:
* No backup has completed successfully in the last 24 hours.
* A backup verification or Test Restore fails.
* The local backup storage partition exceeds 90% capacity.
