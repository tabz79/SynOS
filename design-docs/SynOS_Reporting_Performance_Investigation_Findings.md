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


also these were not verified:
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.8234 ms
[TemplateQueryInterceptor] End of Read. Rows: 9, Bytes: 15740993
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.7112 ms
[TemplateQueryInterceptor] End of Read. Rows: 10, Bytes: 18363358
[10:50:01 INF] CS: Fetch version: 7 ms
[10:50:01 INF] CS: Fetch visit: 1 ms
[10:50:01 INF] BuildDynamicStructure ...... 28 ms
[10:50:01 INF] CS: Resolve template - Order lookup took 0 ms
[10:50:01 INF] CS Resolve: Modality resolve took 0 ms. Resolved modality value: HORM
[10:50:01 INF] CS Resolve Template Row: Name=Radiology_Standard, Modality=Radiology, IsDefault=True, IsDeleted=False
[10:50:01 INF] CS Resolve Template Row: Name=Pathology_Detailed_2Column, Modality=Pathology, IsDefault=True, IsDeleted=False
[10:50:01 INF] CS Resolve Template Row: Name=Pathology_Standard_1Column, Modality=Pathology, IsDefault=False, IsDeleted=False
[10:50:01 INF] CS Resolve: Raw DbCommand Query 1 (Modality) took 0 ms. String Length: 0
[10:50:05 INF] CS Resolve: Raw DbCommand Query 2 (Default fallback) took 3584 ms. String Length: 1311099
[10:50:05 INF] CS Resolve: JSON String retrieval/allocation took 0 ms (Length: 1311099 chars)
[10:50:05 INF] CS Resolve: Deserialize template model took 9 ms
[10:50:05 INF] CS Resolve: ParameterTable section lookup took 0 ms
[10:50:05 INF] CS Resolve: Deserialize table config took 0 ms
[10:50:05 INF] CS Resolve: Map columns took 0 ms
[10:50:05 INF] CS: Resolve template: 3683 ms
[10:50:05 INF] CS: Fetch interpretation/tests: 1 ms
[10:50:05 INF] CS: Prepare snapshot: 0 ms
[10:50:05 INF] CS: SaveChangesAsync: 19 ms
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 1.0712 ms
[TemplateQueryInterceptor] End of Read. Rows: 10, Bytes: 18363358
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.8561 ms
[TemplateQueryInterceptor] End of Read. Rows: 11, Bytes: 20985723
[10:50:25 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:50:25 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:50:50 INF] EVENT_WRITE for VisitId 4d2dee62-fa4a-46da-bbb6-eb91d3117e4e, Context f30c0cf2-2601-4832-b875-09cbe06d7efd:0
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 2.0775 ms
[TemplateQueryInterceptor] End of Read. Rows: 11, Bytes: 20985723
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 6.2284 ms
[TemplateQueryInterceptor] End of Read. Rows: 12, Bytes: 23608088
[10:50:55 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:50:55 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:50:57 INF] EVENT_WRITE for VisitId 4d2dee62-fa4a-46da-bbb6-eb91d3117e4e, Context 2db48b2a-cbeb-4566-9133-1f20e92a1370:0
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 1.4715 ms
[TemplateQueryInterceptor] End of Read. Rows: 12, Bytes: 23608088
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.6392 ms
[TemplateQueryInterceptor] End of Read. Rows: 13, Bytes: 26230453
[10:51:01 INF] CS: Fetch version: 1 ms
[10:51:01 INF] CS: Fetch visit: 7 ms
[10:51:01 INF] BuildDynamicStructure ...... 54 ms
[10:51:01 INF] CS: Resolve template - Order lookup took 1 ms
[10:51:01 INF] CS Resolve: Modality resolve took 0 ms. Resolved modality value: HEM
[10:51:01 INF] CS Resolve Template Row: Name=Radiology_Standard, Modality=Radiology, IsDefault=True, IsDeleted=False
[10:51:01 INF] CS Resolve Template Row: Name=Pathology_Detailed_2Column, Modality=Pathology, IsDefault=True, IsDeleted=False
[10:51:01 INF] CS Resolve Template Row: Name=Pathology_Standard_1Column, Modality=Pathology, IsDefault=False, IsDeleted=False
[10:51:01 INF] CS Resolve: Raw DbCommand Query 1 (Modality) took 0 ms. String Length: 0
[10:51:05 INF] CS Resolve: Raw DbCommand Query 2 (Default fallback) took 3974 ms. String Length: 1311099
[10:51:05 INF] CS Resolve: JSON String retrieval/allocation took 0 ms (Length: 1311099 chars)
[10:51:05 INF] CS Resolve: Deserialize template model took 6 ms
[10:51:05 INF] CS Resolve: ParameterTable section lookup took 0 ms
[10:51:05 INF] CS Resolve: Deserialize table config took 0 ms
[10:51:05 INF] CS Resolve: Map columns took 0 ms
[10:51:05 INF] CS: Resolve template: 4073 ms
[10:51:05 INF] CS: Fetch interpretation/tests: 0 ms
[10:51:05 INF] CS: Prepare snapshot: 0 ms
[10:51:05 INF] CS: SaveChangesAsync: 3 ms
[10:51:25 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:51:25 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.8798 ms
[TemplateQueryInterceptor] End of Read. Rows: 13, Bytes: 26230453
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.7675 ms
[TemplateQueryInterceptor] End of Read. Rows: 14, Bytes: 28852818
[10:51:39 INF] EVENT_WRITE for VisitId fea832a8-8ba3-429f-9ce0-7db9a35f78c8, Context 088c2d3a-bd9b-41ed-9f4c-b427c8105bf3:0
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 3.5429 ms
[TemplateQueryInterceptor] End of Read. Rows: 14, Bytes: 28852818
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 1.7508 ms
[TemplateQueryInterceptor] End of Read. Rows: 15, Bytes: 31475183
[10:51:48 INF] EVENT_WRITE for VisitId fea832a8-8ba3-429f-9ce0-7db9a35f78c8, Context bc933375-ad4a-48e9-9c32-0dab83b8a07c:0
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.7477 ms
[TemplateQueryInterceptor] End of Read. Rows: 15, Bytes: 31475183
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.6981 ms
[TemplateQueryInterceptor] End of Read. Rows: 16, Bytes: 34097548
[10:51:52 INF] CS: Fetch version: 1 ms
[10:51:52 INF] CS: Fetch visit: 1 ms
[10:51:52 INF] BuildDynamicStructure ...... 73 ms
[10:51:52 INF] CS: Resolve template - Order lookup took 0 ms
[10:51:52 INF] CS Resolve: Modality resolve took 0 ms. Resolved modality value: HEM
[10:51:52 INF] CS Resolve Template Row: Name=Radiology_Standard, Modality=Radiology, IsDefault=True, IsDeleted=False
[10:51:52 INF] CS Resolve Template Row: Name=Pathology_Detailed_2Column, Modality=Pathology, IsDefault=True, IsDeleted=False
[10:51:52 INF] CS Resolve Template Row: Name=Pathology_Standard_1Column, Modality=Pathology, IsDefault=False, IsDeleted=False
[10:51:52 INF] CS Resolve: Raw DbCommand Query 1 (Modality) took 0 ms. String Length: 0
[10:51:55 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:51:55 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:51:56 INF] CS Resolve: Raw DbCommand Query 2 (Default fallback) took 3918 ms. String Length: 1311099
[10:51:56 INF] CS Resolve: JSON String retrieval/allocation took 0 ms (Length: 1311099 chars)
[10:51:56 INF] CS Resolve: Deserialize template model took 1 ms
[10:51:56 INF] CS Resolve: ParameterTable section lookup took 0 ms
[10:51:56 INF] CS Resolve: Deserialize table config took 0 ms
[10:51:56 INF] CS Resolve: Map columns took 0 ms
[10:51:56 INF] CS: Resolve template: 3979 ms
[10:51:56 INF] CS: Fetch interpretation/tests: 0 ms
[10:51:56 INF] CS: Prepare snapshot: 0 ms
[10:51:56 INF] CS: SaveChangesAsync: 5 ms
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 2.865 ms
[TemplateQueryInterceptor] End of Read. Rows: 16, Bytes: 34097548
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 6.198 ms
[TemplateQueryInterceptor] End of Read. Rows: 17, Bytes: 36719913
[10:52:15 INF] EVENT_WRITE for VisitId d33e00ab-c15e-4e4e-9f6f-bd70355fc792, Context 6a58f13b-8a72-4dfb-90c4-ced61794ba87:0
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.7531 ms
[TemplateQueryInterceptor] End of Read. Rows: 17, Bytes: 36719913
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.8635 ms
[TemplateQueryInterceptor] End of Read. Rows: 18, Bytes: 39342278
[10:52:22 INF] EVENT_WRITE for VisitId d33e00ab-c15e-4e4e-9f6f-bd70355fc792, Context 81dd2227-970d-41ae-b0bc-f43a5932c2ae:0
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.8696 ms
[TemplateQueryInterceptor] End of Read. Rows: 18, Bytes: 39342278
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 1.2027 ms
[10:52:25 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:52:25 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[TemplateQueryInterceptor] End of Read. Rows: 19, Bytes: 41964643
[10:52:26 INF] CS: Fetch version: 1 ms
[10:52:26 INF] CS: Fetch visit: 1 ms
[10:52:26 INF] BuildDynamicStructure ...... 70 ms
[10:52:26 INF] CS: Resolve template - Order lookup took 1 ms
[10:52:26 INF] CS Resolve: Modality resolve took 0 ms. Resolved modality value: BIO
[10:52:26 INF] CS Resolve Template Row: Name=Radiology_Standard, Modality=Radiology, IsDefault=True, IsDeleted=False
[10:52:26 INF] CS Resolve Template Row: Name=Pathology_Detailed_2Column, Modality=Pathology, IsDefault=True, IsDeleted=False
[10:52:26 INF] CS Resolve Template Row: Name=Pathology_Standard_1Column, Modality=Pathology, IsDefault=False, IsDeleted=False
[10:52:26 INF] CS Resolve: Raw DbCommand Query 1 (Modality) took 0 ms. String Length: 0
[10:52:31 INF] CS Resolve: Raw DbCommand Query 2 (Default fallback) took 4089 ms. String Length: 1311099
[10:52:31 INF] CS Resolve: JSON String retrieval/allocation took 0 ms (Length: 1311099 chars)
[10:52:31 INF] CS Resolve: Deserialize template model took 15 ms
[10:52:31 INF] CS Resolve: ParameterTable section lookup took 0 ms
[10:52:31 INF] CS Resolve: Deserialize table config took 0 ms
[10:52:31 INF] CS Resolve: Map columns took 0 ms
[10:52:31 INF] CS: Resolve template: 4169 ms
[10:52:31 INF] CS: Fetch interpretation/tests: 1 ms
[10:52:31 INF] CS: Prepare snapshot: 0 ms
[10:52:31 INF] CS: SaveChangesAsync: 4 ms
[10:52:55 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:52:55 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:53:25 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:53:25 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:53:55 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:53:55 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:54:25 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:54:25 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:54:55 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:54:55 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:55:25 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:55:25 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:55:55 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:55:55 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:56:25 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:56:25 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:56:55 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:56:55 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:57:25 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:57:25 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:57:56 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:57:56 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:58:26 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:58:26 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:58:56 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:58:56 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:59:26 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:59:26 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[10:59:56 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[10:59:56 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[11:00:26 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[11:00:26 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[11:00:56 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[11:00:56 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 13.841 ms
[TemplateQueryInterceptor] End of Read. Rows: 19, Bytes: 41964643
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 3.5373 ms
[TemplateQueryInterceptor] End of Read. Rows: 20, Bytes: 44587008
[11:01:19 INF] EVENT_WRITE for VisitId 3a0d6f8b-fcfe-47d1-a058-7a50a9e13180, Context a9b93227-578a-48bb-a39a-da212b491772:0
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 1.0159 ms
[TemplateQueryInterceptor] End of Read. Rows: 20, Bytes: 44587008
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.8281 ms
[TemplateQueryInterceptor] End of Read. Rows: 21, Bytes: 47209373
[11:01:26 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[11:01:26 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[11:01:26 INF] EVENT_WRITE for VisitId 3a0d6f8b-fcfe-47d1-a058-7a50a9e13180, Context 88569738-8b23-4e36-beb3-52f8286d419b:0
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 9.6775 ms
[TemplateQueryInterceptor] End of Read. Rows: 21, Bytes: 47209373
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 1.648 ms
[TemplateQueryInterceptor] End of Read. Rows: 22, Bytes: 49831738
[11:01:31 INF] CS: Fetch version: 11 ms
[11:01:31 INF] CS: Fetch visit: 12 ms
[11:01:31 INF] BuildDynamicStructure ...... 74 ms
[11:01:31 INF] CS: Resolve template - Order lookup took 2 ms
[11:01:31 INF] CS Resolve: Modality resolve took 0 ms. Resolved modality value: BIO
[11:01:31 INF] CS Resolve Template Row: Name=Radiology_Standard, Modality=Radiology, IsDefault=True, IsDeleted=False
[11:01:31 INF] CS Resolve Template Row: Name=Pathology_Detailed_2Column, Modality=Pathology, IsDefault=True, IsDeleted=False
[11:01:31 INF] CS Resolve Template Row: Name=Pathology_Standard_1Column, Modality=Pathology, IsDefault=False, IsDeleted=False
[11:01:31 INF] CS Resolve: Raw DbCommand Query 1 (Modality) took 13 ms. String Length: 0
[11:01:36 INF] CS Resolve: Raw DbCommand Query 2 (Default fallback) took 4445 ms. String Length: 1311099
[11:01:36 INF] CS Resolve: JSON String retrieval/allocation took 0 ms (Length: 1311099 chars)
[11:01:36 INF] CS Resolve: Deserialize template model took 0 ms
[11:01:36 INF] CS Resolve: ParameterTable section lookup took 0 ms
[11:01:36 INF] CS Resolve: Deserialize table config took 0 ms
[11:01:36 INF] CS Resolve: Map columns took 0 ms
[11:01:36 INF] CS: Resolve template: 4525 ms
[11:01:36 INF] CS: Fetch interpretation/tests: 6 ms
[11:01:36 INF] CS: Prepare snapshot: 0 ms
[11:01:36 INF] CS: SaveChangesAsync: 9 ms
[11:01:56 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[11:01:56 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 4.5502 ms
[TemplateQueryInterceptor] End of Read. Rows: 22, Bytes: 49831738
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 1.7343 ms
[TemplateQueryInterceptor] End of Read. Rows: 23, Bytes: 52454103
[11:02:18 INF] EVENT_WRITE for VisitId 3a0d6f8b-fcfe-47d1-a058-7a50a9e13180, Context f859dbe2-b947-4fe3-ac16-1d85a4c08f7e:0
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.791 ms
[TemplateQueryInterceptor] End of Read. Rows: 23, Bytes: 52454103
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.9836 ms
[TemplateQueryInterceptor] End of Read. Rows: 24, Bytes: 55076468
[11:02:22 WRN] Savepoints are disabled because Multiple Active Result Sets (MARS) is enabled. If 'SaveChanges' fails, then the transaction cannot be automatically rolled back to a known clean state. Instead, the transaction should be rolled back by the application before retrying 'SaveChanges'. See https://go.microsoft.com/fwlink/?linkid=2149338 for more information and examples. To identify the code which triggers this warning, call 'ConfigureWarnings(w => w.Throw(SqlServerEventId.SavepointsDisabledBecauseOfMARS))'.
[11:02:22 INF] EVENT_WRITE for VisitId 3a0d6f8b-fcfe-47d1-a058-7a50a9e13180, Context 2b6f8140-3ab2-4558-92aa-5163cc85c129:0
[11:02:22 WRN] Savepoints are disabled because Multiple Active Result Sets (MARS) is enabled. If 'SaveChanges' fails, then the transaction cannot be automatically rolled back to a known clean state. Instead, the transaction should be rolled back by the application before retrying 'SaveChanges'. See https://go.microsoft.com/fwlink/?linkid=2149338 for more information and examples. To identify the code which triggers this warning, call 'ConfigureWarnings(w => w.Throw(SqlServerEventId.SavepointsDisabledBecauseOfMARS))'.
[11:02:22 WRN] Savepoints are disabled because Multiple Active Result Sets (MARS) is enabled. If 'SaveChanges' fails, then the transaction cannot be automatically rolled back to a known clean state. Instead, the transaction should be rolled back by the application before retrying 'SaveChanges'. See https://go.microsoft.com/fwlink/?linkid=2149338 for more information and examples. To identify the code which triggers this warning, call 'ConfigureWarnings(w => w.Throw(SqlServerEventId.SavepointsDisabledBecauseOfMARS))'.
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 5.5247 ms
[TemplateQueryInterceptor] End of Read. Rows: 25, Bytes: 57699193
[11:02:26 INF] Found 1 outbox events to sync.
[11:02:26 INF] [INTEGRATION DEB] Hop 1: OutboxWorker POST to /api/events. EventId: 44eba08c-8378-4619-b8cb-57f9945ce095, EventType: ReportSigned
[11:02:26 INF] [INTEGRATION DEB] Hop 1 Success: OutboxWorker POST completed successfully for Event 44eba08c-8378-4619-b8cb-57f9945ce095 (Status: OK).
[11:02:26 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[11:02:26 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 1.2275 ms
[TemplateQueryInterceptor] End of Read. Rows: 25, Bytes: 57699193
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 1.2505 ms
[TemplateQueryInterceptor] End of Read. Rows: 26, Bytes: 60321558
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 1.6736 ms
[TemplateQueryInterceptor] End of Read. Rows: 26, Bytes: 60321558
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 3.7637 ms
[TemplateQueryInterceptor] End of Read. Rows: 27, Bytes: 62943923
[11:02:56 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[11:02:56 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.
[11:03:07 INF] EVENT_WRITE for VisitId d33e00ab-c15e-4e4e-9f6f-bd70355fc792, Context 929a9b42-6475-49b1-b092-b5b1985d1c53:0
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 5.4237 ms
[TemplateQueryInterceptor] End of Read. Rows: 27, Bytes: 62943923
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.7648 ms
[TemplateQueryInterceptor] End of Read. Rows: 28, Bytes: 65566288
[11:03:11 WRN] Savepoints are disabled because Multiple Active Result Sets (MARS) is enabled. If 'SaveChanges' fails, then the transaction cannot be automatically rolled back to a known clean state. Instead, the transaction should be rolled back by the application before retrying 'SaveChanges'. See https://go.microsoft.com/fwlink/?linkid=2149338 for more information and examples. To identify the code which triggers this warning, call 'ConfigureWarnings(w => w.Throw(SqlServerEventId.SavepointsDisabledBecauseOfMARS))'.
[11:03:11 INF] EVENT_WRITE for VisitId d33e00ab-c15e-4e4e-9f6f-bd70355fc792, Context e5162241-b195-4cc3-ad94-010e3b413706:0
[11:03:11 WRN] Savepoints are disabled because Multiple Active Result Sets (MARS) is enabled. If 'SaveChanges' fails, then the transaction cannot be automatically rolled back to a known clean state. Instead, the transaction should be rolled back by the application before retrying 'SaveChanges'. See https://go.microsoft.com/fwlink/?linkid=2149338 for more information and examples. To identify the code which triggers this warning, call 'ConfigureWarnings(w => w.Throw(SqlServerEventId.SavepointsDisabledBecauseOfMARS))'.
[11:03:11 WRN] Savepoints are disabled because Multiple Active Result Sets (MARS) is enabled. If 'SaveChanges' fails, then the transaction cannot be automatically rolled back to a known clean state. Instead, the transaction should be rolled back by the application before retrying 'SaveChanges'. See https://go.microsoft.com/fwlink/?linkid=2149338 for more information and examples. To identify the code which triggers this warning, call 'ConfigureWarnings(w => w.Throw(SqlServerEventId.SavepointsDisabledBecauseOfMARS))'.
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 0.9466 ms
[TemplateQueryInterceptor] End of Read. Rows: 29, Bytes: 68189013
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 1.4206 ms
[TemplateQueryInterceptor] End of Read. Rows: 29, Bytes: 68189013
[TemplateQueryInterceptor] SQL starts
[TemplateQueryInterceptor] SQL finishes. Duration: 1.1976 ms
[TemplateQueryInterceptor] End of Read. Rows: 30, Bytes: 70811378
[11:03:26 INF] Found 1 outbox events to sync.
[11:03:26 INF] [INTEGRATION DEB] Hop 1: OutboxWorker POST to /api/events. EventId: 1319fb37-cf1f-4ce6-83f8-5edbcab0c4a0, EventType: ReportSigned
[11:03:26 INF] [INTEGRATION DEB] Hop 1 Success: OutboxWorker POST completed successfully for Event 1319fb37-cf1f-4ce6-83f8-5edbcab0c4a0 (Status: OK).
[11:03:26 INF] [INTEGRATION DEB] OutboxWorker POST heartbeat to /api/events.
[11:03:26 INF] [INTEGRATION DEB] Heartbeat sent successfully to Middleware API.