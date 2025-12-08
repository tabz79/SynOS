14.6 is where we **tighten screws**: multi-branch security, limits, and cleanup tools.

Here’s your ready-to-paste **Day 14.6 backend prompt**.

---

## Day 14.6 — PACS Multi-Branch Security & Maintenance (Backend Only)

Use this as your Gemini backend prompt.

---

**Title:**
Day 14.6 — Mini PACS Cross-Branch Security, Limits & Maintenance (Backend Only)

**Context:**
You are a .NET 8 BACKEND expert working on **SynOS**, a Diagnostic Lab Management System.

Stack:

* ASP.NET Core .NET 8 Web API
* EF Core + SQL Server
* Layered/clean-ish architecture:

  * Data / Entities / EF Config / Migrations
  * Services / Domain logic
  * DTOs/Models
  * Api / Controllers / DI

Radiology & Mini PACS status so far:

* Radiology module complete up to **Day 14.2**:

  * RadiologyStudy, RadiologyReports, assignments, signing, RBAC, etc.
* Mini PACS backend:

From **Day 14.3**:

* Tables `PacsSeries` & `PacsInstances` exist with:

  * `RadiologyStudyId`, `OrgId`, `BranchId`, UIDs, etc.
* PACS storage:

  * `Pacs:RootPath` config
  * Files stored under:

    * `{RootPath}/{OrgId}/{BranchId}/{RadiologyStudyId}/{SeriesId}/{InstanceId}.dcm`
* Upload endpoint:

  * `POST /api/v1/radiology/pacs/{radiologyStudyId}/upload`

From **Day 14.4**:

* DICOM parsing library integrated (e.g. FellowOakDicom).
* `UploadDicomAsync` reads real DICOM tags and fills PACS metadata:

  * StudyInstanceUid, SeriesInstanceUid, SopInstanceUid, Modality, SeriesDescription, SeriesNumber, InstanceNumber, FrameCount, etc.
* Reindex endpoint:

  * `POST /api/v1/radiology/pacs/{radiologyStudyId}/reindex`
* Download endpoint:

  * `GET /api/v1/radiology/pacs/instances/{instanceId}/file`

From **Day 14.5**:

* `GET /api/v1/radiology/pacs/studies/{radiologyStudyId}/series-tree`:

  * Returns `PacsSeriesTreeDto` with:

    * StudyInstanceUid
    * Series list
    * Instances sorted by InstanceNumber
    * Prebuilt `wadouri:` URLs for each instance.

**Goal of Day 14.6:**

* Make Mini PACS **safe for multi-branch, production-like use**:

  * Enforce Org/Branch scoping for every PACS operation.
  * Respect existing RBAC (who can see cross-branch vs branch-only).
* Introduce **limits & guardrails** (max series/instances returned).
* Add **maintenance/admin endpoints**:

  * Detect orphans (DB record but missing file, or file with missing study/series).
  * Mark or clean these safely (no wild data loss).
  * Give basic storage statistics per Org/Branch.

Backend-only. No frontend.

---

### 🔒 Guardrails / Constraints

* **Backend only.**
  No React, no JS, no UI.
* Do NOT run shell, EF CLI, or git commands (you can suggest them in TLDR).
* Only touch:

  * PACS-related entities/configs/migrations (if needed)
  * PACS services (IPacsService + implementation)
  * Radiology security helpers if absolutely needed
  * DTOs/Models for PACS admin views
  * PACS controllers & DI registration
* Do NOT redesign PACS schema.
  Only small additions (like IsDeleted flags, indexes) if required.

---

## 1) Centralize Org/Branch & RBAC Enforcement for PACS

We want **zero chance** of someone seeing another org’s images just because they know a GUID.

### 1.1 Add / Reuse a Security Helper

If there is already a central security helper for Radiology (e.g. something that checks a `RadiologyStudy` vs current user roles + Org/Branch), reuse or extend it.

If not, create a small helper/service, e.g.:

```csharp
public interface IRadiologyAccessGuard
{
    Task EnsureCanAccessStudyAsync(Guid radiologyStudyId, Guid currentUserId);
    Task EnsureCanAccessPacsInstanceAsync(Guid instanceId, Guid currentUserId);
}
```

**Behavior:**

* Load entities (RadiologyStudy, PacsInstance → RadiologyStudy) with OrgId/BranchId.

* Use existing RBAC + org/branch restrictions to decide:

  Examples (adapt to what you already have):

  * Radiologist/XRayTech:

    * Can access studies & PACS within their assigned Org and Branches.
  * Admin / OrgAdmin:

    * Can access all branches within their Org.
  * SuperAdmin (if exists):

    * Can access anything.

* If user is not allowed:

  * Throw domain-level `ForbiddenAccessException` (or equivalent) mapped to 403.

### 1.2 Use the Guard in All PACS Operations

Update PACS service methods to always call the guard, instead of hand-rolling checks:

* `UploadDicomAsync(radiologyStudyId, …)`:

  * Must call `EnsureCanAccessStudyAsync` before doing anything.
* `GetDicomStreamAsync(instanceId, …)`:

  * Must call `EnsureCanAccessPacsInstanceAsync`.
* `ReindexStudyAsync(radiologyStudyId, …)`:

  * Must call `EnsureCanAccessStudyAsync`.
* `GetSeriesTreeAsync(radiologyStudyId, …)`:

  * Must call `EnsureCanAccessStudyAsync`.

Ensure that:

* No PACS query is ever executed without verifying Org/Branch + role.
* There is no other code path that leaks PACS data by raw ID.

---

## 2) Add PACS Limits & Guardrails

We don’t want API to explode if a study/series has a crazy number of images.

### 2.1 Configuration

In `appsettings` (and strongly-typed options), add a PACS settings section like:

```json
"Pacs": {
  "RootPath": "/data/pacs",
  "MaxInstancesPerSeriesInSeriesTree": 5000,
  "MaxTotalInstancesPerStudyInSeriesTree": 20000
}
```

(Values are examples; choose reasonable defaults.)

Bind to a strongly-typed class, e.g. `PacsOptions`.

### 2.2 Enforce Limits in Series Tree

In `GetSeriesTreeAsync` (Day 14.5 implementation):

* Before returning DTO:

  * Compute `totalInstances` across all series.
  * If `totalInstances` > `MaxTotalInstancesPerStudyInSeriesTree`:

    * Either:

      * Throw a domain exception that gets mapped to 400/422 with message like:

        * “Too many images in this study to return in a single call.”
      * Or, if you prefer, truncate the list and indicate truncation in response (simpler is to fail with an error).

* For each series:

  * If its instance count > `MaxInstancesPerSeriesInSeriesTree`:

    * Same approach: fail or truncate.
    * For now, simplest is fail with error.

Document behavior in comments.

**Key point:**
Don’t silently hide data in V1; explicit error is better.

### 2.3 Safe Querying

Make sure `GetSeriesTreeAsync`:

* Uses at most 1–2 DB queries, not a query per instance.
* Leverages `Where` and `OrderBy` in LINQ/EF, not in-memory for huge sets.

---

## 3) Maintenance & Admin Endpoints

We want tools for admins to keep PACS clean.

### 3.1 Soft-delete flags (optional but recommended)

If not already present, add to `PacsSeries` and `PacsInstances`:

* `IsDeleted` (bool, default false)
* `DeletedAt` (DateTimeOffset?, nullable)
* `DeletedBy` (Guid?, nullable)

This is for **logical deletion**, not physical file removal (except obvious broken orphans) in 14.6.

Add via EF migration only if not existing.

### 3.2 Orphan Detection Service Method

Extend PACS service with admin-oriented methods, e.g.:

```csharp
public sealed class PacsOrphanSummaryDto
{
    public int InstancesMissingFiles { get; set; }
    public int InstancesWithMissingStudy { get; set; }
    public int SeriesWithNoInstances { get; set; }
}

public sealed class PacsStorageStatsDto
{
    public long TotalBytes { get; set; }
    public int TotalStudies { get; set; }
    public int TotalSeries { get; set; }
    public int TotalInstances { get; set; }

    public IReadOnlyList<PacsOrgBranchStatsDto> ByOrgBranch { get; set; } = Array.Empty<PacsOrgBranchStatsDto>();
}

public sealed class PacsOrgBranchStatsDto
{
    public Guid OrgId { get; set; }
    public Guid BranchId { get; set; }
    public long TotalBytes { get; set; }
    public int Studies { get; set; }
    public int Series { get; set; }
    public int Instances { get; set; }
}
```

Add service methods:

```csharp
Task<PacsOrphanSummaryDto> GetOrphanSummaryAsync(Guid currentUserId);
Task<PacsStorageStatsDto> GetStorageStatsAsync(Guid currentUserId);
Task<PacsOrphanSummaryDto> CleanupOrphansAsync(Guid currentUserId);
```

**Permissions:**

* Only `Admin`/`SuperAdmin`-level roles can use these.
* Enforce in service or via separate Admin guard.

#### Orphan types:

* **InstancesMissingFiles**:

  * `PacsInstance` row exists, but `FilePath` is missing on disk.
* **InstancesWithMissingStudy**:

  * `PacsInstance.RadiologyStudyId` points to a non-existing study.
* **SeriesWithNoInstances**:

  * `PacsSeries` has no non-deleted instances.

### 3.3 Implementation Rules

* **GetOrphanSummaryAsync**:

  * Scan `PacsInstances` and `PacsSeries`:

    * Check file existence using `File.Exists(instance.FilePath)`.
    * Check study existence via a join or follow-up query.
  * Count each orphan type and return summary.
  * Do not modify any data.

* **CleanupOrphansAsync**:

  * For safety, do **not** hard-delete real clinical data.
  * But for clearly broken entries, you may:

    * Mark `PacsInstance` as `IsDeleted = true`, set `DeletedAt`, `DeletedBy`.
    * Optionally remove DB rows where the file is missing and study is missing (pure garbage).
  * Do NOT delete any existing `.dcm` files from disk in this step, unless:

    * You are 100% sure they are unreferenced by any DB row (you can skip this in 14.6).
  * Return updated orphan summary after action.

* **GetStorageStatsAsync**:

  * Aggregate PACS usage:

    * Sum `FileSizeBytes` across non-deleted instances.
    * Count unique RadiologyStudyId, Series, Instances.
    * Group by OrgId + BranchId for per-branch stats.

### 3.4 Admin Controller

Create a PACS admin controller, e.g.:

`api/v1/radiology/pacs/admin/...`

Endpoints:

1. `GET api/v1/radiology/pacs/admin/orphans`

   * `[Authorize(Roles = "Admin,SuperAdmin")]`
   * Returns `PacsOrphanSummaryDto`.

2. `POST api/v1/radiology/pacs/admin/orphans/cleanup`

   * `[Authorize(Roles = "Admin,SuperAdmin")]`
   * Calls `CleanupOrphansAsync`.
   * Returns updated `PacsOrphanSummaryDto`.

3. `GET api/v1/radiology/pacs/admin/storage-stats`

   * `[Authorize(Roles = "Admin,SuperAdmin")]`
   * Returns `PacsStorageStatsDto`.

Use your existing pattern to get `currentUserId` from claims.

---

## 4) Logging & Safety

* Log all admin operations:

  * Cleanup orphans
  * Any soft-deletions

Include:

* UserId, timestamp, counts of affected rows.

Make sure exceptions in admin endpoints yield safe HTTP codes (400/403/500) with non-sensitive messages.

---

## 5) Acceptance Criteria for Day 14.6

Day 14.6 is DONE when:

1. **Access Guard**:

   * There is a reusable access guard or equivalent logic that:

     * Validates Org/Branch + RBAC for:

       * `UploadDicomAsync`
       * `GetDicomStreamAsync`
       * `ReindexStudyAsync`
       * `GetSeriesTreeAsync`
   * All these methods now go through the guard, not ad-hoc checks.

2. **Limits**:

   * `PacsOptions` (or similar) holds:

     * `MaxInstancesPerSeriesInSeriesTree`
     * `MaxTotalInstancesPerStudyInSeriesTree`
   * `GetSeriesTreeAsync` enforces these limits and fails with a clear error if exceeded.

3. **Maintenance**:

   * Service methods exist:

     * `GetOrphanSummaryAsync`, `CleanupOrphansAsync`, `GetStorageStatsAsync`.
   * They correctly categorize:

     * Instances with missing files.
     * Instances with missing studies.
     * Series with no instances.
   * Cleanup uses **soft-delete** (IsDeleted + DeletedAt + DeletedBy) or safe DB removal only for obviously broken orphans.

4. **Admin APIs**:

   * `GET /api/v1/radiology/pacs/admin/orphans`
   * `POST /api/v1/radiology/pacs/admin/orphans/cleanup`
   * `GET /api/v1/radiology/pacs/admin/storage-stats`
   * All restricted to Admin/SuperAdmin roles.

5. No frontend code has been added or changed.

---

**At the end of your answer**, give a short TLDR:

* What Day 14.6 implemented (1–2 lines).
* Main files added/changed.
* Any manual steps (e.g., `dotnet ef migrations add`, update appsettings etc.).

---

