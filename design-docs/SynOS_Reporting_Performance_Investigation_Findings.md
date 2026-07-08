# SynOS Reporting Performance Investigation Findings

## Executive Summary

We investigated the Workbench → Complete Assignment pipeline. The
original 30-second delay was caused by duplicate verification. After
fixing that, the remaining 4--5 second delay was traced to report
template resolution and materialization.

## Major Findings

### 1. Duplicate verification (Fixed)

-   Every child order in an LFT profile triggered
    `SubmitForVerificationAsync`.
-   The same report snapshot was regenerated multiple times.
-   Deduplicating verification reduced completion from \~30s to \~4--5s.

### 2. Current bottleneck

Timing after the fix: - Orders Updated: 6--12 ms -
BuildDynamicStructure: 150--270 ms - Resolve Template: 3.2--4.2 s -
SaveChanges: 30--50 ms

Conclusion: Resolve Template dominates execution time.

### 3. SQL is not the bottleneck

Instrumentation showed: - SQL execution ≈ 7 ms - EF materialization ≈
4.1 s

The delay occurs after SQL execution while reading/materializing a very
large TemplateJson payload.

### 4. Template size

-   Pathology_Detailed_2Column ≈ 2.62 MB
-   Radiology_Standard ≈ 2.62 MB

Almost the entire payload is the embedded Base64 background image.

Important: The background image is intentional and required for branded
reports. Do not remove it merely for performance.

### 5. Architectural mismatch

Current flow: Order.Department (BIO) → lookup ReportTemplates.Modality

Templates contain: - Pathology - Radiology

Therefore `WHERE Modality='BIO'` always returns zero rows and forces a
default fallback.

### 6. ReportTemplateId is ignored

Test Master stores ReportTemplateId. Report also stores
ReportTemplateId.

However CreateSnapshotAsync ignores it and performs Department/Modality
lookup instead.

Recommended future design: Report → ReportTemplateId → Load template
directly.

### 7. Frontend audit

-   Template downloaded once.
-   Cached in React state.
-   Live preview reuses cached template.
-   Save Draft does not reload template.
-   Preview uses a separate renderer.

### 8. Backend audit

Complete Assignment: - Reloads template - Deserializes 2.6 MB JSON -
Creates snapshot - Saves snapshot

### 9. Possible workflow improvement

Current: Workbench → Complete → Snapshot → Typist → Pathologist

Future: Workbench → Complete → Typist → Pathologist Sign-off → Snapshot
→ PDF/Delivery

## Ruled Out

-   SaveChanges
-   Cost attribution
-   Event writing
-   SignalR
-   BuildDynamicStructure
-   SQL execution

## Post-demo roadmap

P0: Resolve template using ReportTemplateId. P1: Populate
ReportTemplateId for all tests. P2: Add server-side template cache. P3:
Revisit template storage strategy while preserving offline capability.
P4: Revisit snapshot generation timing.

## Final conclusions

-   30-second delay fixed.
-   Remaining delay is template materialization.
-   SQL Server is not the bottleneck.
-   Template lookup strategy is architecturally incorrect.
-   Fix correctness before further optimization.
