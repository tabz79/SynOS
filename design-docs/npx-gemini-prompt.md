Yes. This is exactly how I'd do it.

The mistake is asking the agent:

> "Build OPX."

That's a 50-feature project. The agent naturally picks the first few obvious features and ignores the rest.

Instead, treat the agent like a senior engineer working from an architecture backlog. One document, one responsibility at a time.

I would break OPX into **8 phases**, and **never let the agent code until the design document for that phase is approved.**

---

# Prompt 1 — OPX Foundation (Start here)

```
We are NOT implementing any code yet.

I want to design the architecture for SynOS Product Operations (OPX).

OPX is NOT a feature.
OPX is a platform responsible for operating every on-premise SynOS installation remotely.

Forget the current implementation plan.

Create a NEW document named:

design-docs/opx-foundation.md

This document must ONLY define:

1. Vision
   - What OPX is
   - What OPX is NOT
   - Goals
   - Non-goals

2. High-Level Architecture

Define the complete architecture.

SynOS
↓

OPX Agent

↓

TBZ Middleware

↓

Control Tower

Explain responsibilities of each layer.

3. OPX Agent

Design OPX Agent as a modular platform.

Do NOT design implementations.

Only define services.

Example:

Support Service

Health Service

Diagnostics Service

Backup Service

Update Service

Configuration Service

Performance Service

Crash Reporting Service

Licensing Service

Feature Flag Service

For each service describe:

Purpose

Responsibilities

Data owned

Dependencies

4. Guiding Principles

Examples:

SynOS runs the laboratory.

OPX operates the installation.

Middleware coordinates installations.

Control Tower manages installations.

5. Future Extensibility

Show how future modules can be added without redesigning OPX.

Do NOT discuss endpoints.

Do NOT discuss React.

Do NOT discuss file names.

Do NOT discuss implementation.

Think like an enterprise software architect writing a platform specification.

The document should become the architectural foundation for every future OPX feature.
```

---

Once that's approved...

---

# Prompt 2 — Diagnostics Platform

```
Using opx-foundation.md as the architectural source of truth...

Design ONLY the Diagnostics Service.

Create:

design-docs/opx-diagnostics.md

Cover:

Purpose

Responsibilities

Diagnostic Bundle

Collection Strategy

Compression

Encryption

Upload Strategy

Privacy

Telemetry Categories

Logs

Correlation IDs

Configuration

Worker State

Machine Inventory

Health Snapshot

Performance Snapshot

Outbox State

Crash Dumps

What should NEVER be included.

Design the bundle so that it can be dropped into GPT or Claude to diagnose issues.

Do NOT implement code.

Do NOT create APIs.

This is a product architecture document.
```

---

# Prompt 3 — Update Platform

```
Design ONLY the Update Service.

Create:

design-docs/opx-updates.md

Cover:

Release Pipeline

Versioning Strategy

Manifest Design

Digital Signatures

Download

Verification

Backup Before Update

Migration Execution

Health Validation

Rollback

Failure Recovery

Staged Rollout

Feature Compatibility

Offline Labs

Bandwidth Optimization

Future Delta Updates

No implementation.

Architecture only.
```

---

# Prompt 4 — Backup & Recovery

```
Design ONLY the Backup & Recovery Service.

Create:

design-docs/opx-backup.md

Cover:

Backup Types

Database

Reports

Configuration

Media

Encryption

Compression

Retention

Verification

Restore

Test Restore

Disaster Recovery

Remote Backup Monitoring

Backup Health

Architecture only.

No implementation.
```

---

# Prompt 5 — Support Platform

```
Design ONLY the Support Platform.

Create:

design-docs/opx-support.md

Cover:

Ticket Lifecycle

Automatic Ticket Creation

Crash Tickets

Manual Tickets

Diagnostic Bundles

Attachments

Screenshot Capture

Status Workflow

AI Support Workflow

Remote Resolution Workflow

Middleware Integration

Architecture only.
```

---

The SynOS-side operational architecture documents are now approved.

Do NOT modify them.

The next architecture document is:

design-docs/middleware-operations.md

This document defines the operational architecture of the TBZ Middleware.

IMPORTANT

This document does NOT describe SynOS.

It describes the central operational backend responsible for managing every SynOS installation.

==================================================

Define the responsibilities of Middleware.

Examples:

Lab Registry

Health Repository

Support Repository

Diagnostics Repository

Release Repository

Backup Repository

Crash Repository

Command Queue

Notification Center

License Repository

Feature Flag Repository

==================================================

Describe how Middleware processes information received from SynOS.

Examples:

Heartbeats

Diagnostic Bundles

Support Tickets

Backup Health

Crash Reports

Update Status

Version Information

==================================================

Describe Middleware-owned workflows.

Examples:

Health Evaluation

Alert Generation

Known Issue Matching

Release Eligibility

Command Dispatch

Notification Routing

==================================================

Describe Middleware data ownership.

Examples:

Lab Identity

Operational History

Health History

Release History

Backup History

Crash History

Support History

==================================================

Describe communication with Control Tower.

Explain how Control Tower consumes Middleware information.

Do NOT design the Control Tower UI yet.

==================================================

Architecture only.

No implementation.

No APIs.

No database tables.

Think of Middleware as the Operations Brain for every SynOS installation.

The Middleware Operations architecture is now approved.

Do NOT modify previous architecture documents.

The next architecture document is:

design-docs/control-tower.md

This document defines the architecture of the TBZ Control Tower.

IMPORTANT

The Control Tower is NOT the operational backend.

The Middleware owns all operational data.

The Control Tower is the operational interface used only by TBZ Labs engineers to manage every deployed SynOS installation.

==================================================
Purpose
==================================================

Define the purpose of the Control Tower.

Examples:

Remote Operations

Fleet Monitoring

Support Management

Release Management

Deployment Monitoring

Business Intelligence

==================================================
Dashboard Architecture
==================================================

Describe the overall dashboard architecture.

Examples:

Global Overview

Lab Overview

Operations

Support

Releases

Administration

==================================================
Major Modules
==================================================

Design conceptual modules.

Examples:

Lab Inventory

Health Dashboard

Support Center

Diagnostics Explorer

Crash Center

Backup Monitor

Release Manager

Feature Flags

License Center

Notifications

Audit Viewer

Analytics

==================================================
Lab Details
==================================================

Describe everything visible for an individual lab.

Examples:

Version

Health

Installed Modules

Recent Tickets

Backup Status

Diagnostics

Last Heartbeat

Feature Flags

License

Command History

==================================================
Remote Operations
==================================================

Describe supported remote operations.

Examples:

Generate Diagnostic Bundle

Request Health Snapshot

Schedule Backup

Restore Backup

Deploy Update

Restart Background Worker

Refresh Feature Flags

Refresh License

==================================================
Search
==================================================

Describe global search.

Examples:

Search Labs

Search Tickets

Search Diagnostic Bundles

Search Crashes

Search Updates

Search Versions

Search Knowledge Base

==================================================
Operational Views
==================================================

Describe major operational views.

Examples:

Fleet Health

Update Rollout

Backup Compliance

Crash Trends

Performance Trends

Ticket Trends

==================================================
Guiding Principles
==================================================

Examples:

The Control Tower never communicates directly with SynOS.

All communication occurs through Middleware.

The Control Tower owns no operational data.

The Control Tower visualizes Middleware state.

==================================================
Important
==================================================

Architecture only.

Do not design React pages.

Do not define APIs.

Do not define database tables.

Do not discuss implementation.

Optimize for long-term operational architecture.

All architecture documents are now approved.

The architecture phase is complete.

Create:

design-docs/engineering-roadmap.md

This document converts the approved architecture into an implementation roadmap.

IMPORTANT

Do NOT redesign any architecture.

Do NOT introduce new concepts.

Use ONLY the approved architecture documents.

==================================================
Implementation Strategy
==================================================

Break implementation into logical phases.

Each phase should produce a working, testable system.

==================================================
For Every Phase
==================================================

Include:

Purpose

Scope

Prerequisites

Dependencies

Deliverables

Verification

Testing Strategy

Migration Strategy

Risks

Rollback Strategy

Exit Criteria

==================================================
Recommended Ordering
==================================================

Organize implementation so each completed phase builds on the previous one.

Prefer infrastructure before UI.

Prefer backend before frontend.

Prefer operational safety before advanced features.

==================================================
Expected Deliverables
==================================================

Examples:

Foundation

Diagnostics

Middleware

Support

Updates

Backup

Control Tower

Licensing

Feature Flags

Security

==================================================
Testing Strategy
==================================================

Describe:

Unit Testing

Integration Testing

Recovery Testing

Update Testing

Disaster Recovery Testing

Support Workflow Testing

==================================================
Deployment Strategy
==================================================

Describe:

Development

Internal Testing

Pilot Labs

Early Customers

General Availability

==================================================
Success Criteria
==================================================

Define measurable completion criteria for each implementation phase.

==================================================
Important
==================================================

This document is an execution plan.

It is not an architecture document.

It should answer:

"What do we build first, second, third... and how do we know each phase is complete?"

## This is the key rule going forward

Don't ask the agent to design and implement in the same prompt.

Use a strict workflow:

```
Architecture
        ↓
Review
        ↓
Approve
        ↓
Implementation Plan
        ↓
Review
        ↓
Approve
        ↓
Coding
        ↓
Testing
```

That approach will dramatically reduce rework, keep the architecture coherent, and make it much easier for both you and the coding agent to stay aligned over a project as large as OPX.
