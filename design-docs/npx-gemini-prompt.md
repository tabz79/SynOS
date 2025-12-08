## Day 14.5 — Series Tree + WADO-style API (Backend Only)

Use this as your Gemini backend prompt.

---

**Title:**
Day 14.5 — PACS Series Tree + WADO-style API for RadiologyStudy (Backend Only)

**Context:**
You are a .NET 8 BACKEND expert working on **SynOS**, a Diagnostic Lab Management System.

Existing backend stack:

* ASP.NET Core .NET 8 Web API
* EF Core + SQL Server
* Layered/clean-ish architecture:

  * Data / Entities / EF Config / Migrations
  * Services / Domain logic
  * DTOs/Models
  * Api / Controllers / DI / Middleware

Radiology module is already implemented up to **Day 14.4**:

* RadiologyStudy, RadiologyReports, workflow, RBAC, etc.
* Mini PACS backend:

  From **Day 14.3**:

  * `PacsSeries` + `PacsInstances` tables exist.
  * PACS file storage layout implemented:

    * `Pacs:RootPath` → `{RootPath}/{OrgId}/{BranchId}/{RadiologyStudyId}/{SeriesId}/{InstanceId}.dcm`
  * Upload endpoint:

    * `POST /api/v1/radiology/pacs/{radiologyStudyId}/upload`
    * Saves files to disk + creates PacsSeries & PacsInstances rows.

  From **Day 14.4**:

  * DICOM parser (e.g. FellowOakDicom) integrated.
  * `UploadDicomAsync` now extracts real tags:

    * StudyInstanceUid, SeriesInstanceUid, SopInstanceUid, Modality, SeriesDescription, SeriesNumber, InstanceNumber, FrameCount, etc.
  * Reindex endpoint:

    * `POST /api/v1/radiology/pacs/{radiologyStudyId}/reindex`
    * Rebuilds PACS metadata from DICOM files.
  * Download endpoint:

    * `GET /api/v1/radiology/pacs/instances/{instanceId}/file`
    * Streams raw `.dcm`.

**Goal of Day 14.5:**

* Build a **single read-only API** that returns the **full PACS “series tree”** for a given RadiologyStudy.
* This tree is tailored for future **Cornerstone3D** use:

  * Sorted instance list per series.
  * Prebuilt `wadouri:` URLs for each instance.
* Backend-only. No frontend or Cornerstone code today.

---

### 🔒 Guardrails / Constraints

* **Backend only.**

  * No React, no JS, no UI changes.
* Do NOT run shell or git commands.

  * You can *suggest* `dotnet ef` or `dotnet add package` in TLDR, but do not execute them.
* Only touch:

  * Data layer (queries, if needed)
  * Services (`IPacsService`, implementation)
  * DTOs/Models
  * Api controllers + DI
* Do NOT refactor other modules or radiology workflows.
  Keep changes scoped to **PACS reading** and minimal support code.

---

## 1) Series Tree API – Contract

Create an API that returns a **Cornerstone-ready** structure for a given RadiologyStudy.

### Endpoint

`GET api/v1/radiology/pacs/studies/{radiologyStudyId:guid}/series-tree`

### Auth / Permissions

* `[Authorize(Roles = "Radiologist,XRayTech,Admin")]`
* User must:

  * Belong to the same `OrgId` (and optionally branch) as the RadiologyStudy,
  * Or have cross-branch privileges according to existing RBAC rules.

Use the same style of org/branch + role enforcement already used in radiology APIs.

### Response DTO

Create a DTO model similar to:

```csharp
public sealed class PacsSeriesTreeDto
{
    public Guid RadiologyStudyId { get; set; }
    public string StudyInstanceUid { get; set; } = default!;
    public IReadOnlyList<PacsSeriesNodeDto> Series { get; set; } = Array.Empty<PacsSeriesNodeDto>();
}

public sealed class PacsSeriesNodeDto
{
    public Guid SeriesId { get; set; }
    public string SeriesInstanceUid { get; set; } = default!;
    public string? Modality { get; set; }
    public string? Description { get; set; }
    public int? SeriesNumber { get; set; }
    public int InstanceCount { get; set; }
    public IReadOnlyList<PacsInstanceNodeDto> Instances { get; set; } = Array.Empty<PacsInstanceNodeDto>();
}

public sealed class PacsInstanceNodeDto
{
    public Guid InstanceId { get; set; }
    public string SopInstanceUid { get; set; } = default!;
    public int? InstanceNumber { get; set; }
    public int? FrameCount { get; set; }

    // This is what Cornerstone will later use as imageId directly:
    public string Wadouri { get; set; } = default!;
}
```

Notes:

* `StudyInstanceUid` should be taken from PACS data (from any series/instance under this study – they should all match).
* `InstanceCount` is just `Instances.Count` for that series.
* `Wadouri` string must be the **full `wadouri:` prefixed URL** to the instance file.

---

## 2) Service Method – Building the Series Tree

Extend `IPacsService` with a read-only method:

```csharp
public interface IPacsService
{
    // Existing methods...
    Task<PacsSeriesTreeDto> GetSeriesTreeAsync(
        Guid radiologyStudyId,
        Guid currentUserId,
        string apiBaseUrl // or some way to build absolute URLs
    );
}
```

You can choose how to get `apiBaseUrl`:

* Option A (simpler):

  * Controller obtains it from `HttpContext.Request` (scheme + host) and passes into service.
* Option B:

  * Service gets `IHttpContextAccessor` injected and builds URLs internally.
* Either is fine; pick whatever matches your existing pattern.

### Implementation details:

**Step 1 – Validate Study + Permissions**

* Load `RadiologyStudy` by `radiologyStudyId`.
* Make sure study exists and `currentUserId` has permission:

  * Org/branch check
  * Role (Radiologist/XRayTech/Admin)

Reuse existing radiology security logic where possible.

**Step 2 – Fetch PACS Data**

* Query `PacsSeries` where `RadiologyStudyId == radiologyStudyId`.

* If no series found:

  * Return an empty `PacsSeriesTreeDto` with:

    * `RadiologyStudyId` = input id
    * `StudyInstanceUid` = maybe empty string or null-equivalent but keep property non-nullable in DTO (e.g. empty string)
    * `Series` = empty list.

* Query `PacsInstances` where `RadiologyStudyId == radiologyStudyId`.

* Optionally do this with a single query and project into DTO directly (to avoid N+1), but clarity is more important than over-optimization for now.

**Step 3 – Determine StudyInstanceUid**

* If there is at least one series or instance, pick `StudyInstanceUid` from:

  * e.g. the first series’ `StudyInstanceUid`, or
  * the first instance’s `StudyInstanceUid`.
* Assuming Day 14.4 has ensured consistent UIDs per study.

**Step 4 – Build Series → Instances structure**

* For each `PacsSeries` row:

  * Filter its instances from `PacsInstances` based on `SeriesId`.
  * Sort instances by:

    * `InstanceNumber` ascending, with nulls pushed to end,
    * then `InstanceId` as tie-breaker.

* For each instance build `PacsInstanceNodeDto`:

  * `InstanceId` = DB value
  * `SopInstanceUid` = DB value
  * `InstanceNumber` = DB value
  * `FrameCount` = DB value
  * `Wadouri` = build like:

    ```csharp
    var wadouri = $"wadouri:{apiBaseUrl.TrimEnd('/')}/api/v1/radiology/pacs/instances/{instance.InstanceId}/file";
    ```

* For each series build `PacsSeriesNodeDto`:

  * `SeriesId`, `SeriesInstanceUid`, `Modality`, `Description`, `SeriesNumber` from DB.
  * `InstanceCount` = number of instances attached.
  * `Instances` = sorted list above.

**Step 5 – Return**

Create and return `PacsSeriesTreeDto`:

* `RadiologyStudyId` = input
* `StudyInstanceUid` = selected UID
* `Series` = list of `PacsSeriesNodeDto` sorted by:

  * `SeriesNumber` ascending (if available), otherwise by `SeriesInstanceUid` or `SeriesId`.

---

## 3) API Controller – Series Tree Endpoint

In `PacsController` (or another radiology PACS controller), add:

```csharp
[HttpGet("studies/{radiologyStudyId:guid}/series-tree")]
[Authorize(Roles = "Radiologist,XRayTech,Admin")]
public async Task<IActionResult> GetSeriesTree(Guid radiologyStudyId)
{
    var currentUserId = _currentUserService.GetUserId(); // or your existing pattern

    // build base URL: scheme + host + optional base path
    var request = HttpContext.Request;
    var apiBaseUrl = $"{request.Scheme}://{request.Host.ToUriComponent()}"; 
    // if you have API behind a reverse proxy with path base, include that too.

    var result = await _pacsService.GetSeriesTreeAsync(
        radiologyStudyId,
        currentUserId,
        apiBaseUrl);

    return Ok(result);
}
```

Notes:

* Do NOT expose extra internal info.
* All RBAC & org/branch checks must be done inside the service (or via any shared helper you already use).

---

## 4) Performance & Safeguards (Basic)

Even though this is V1, add some basic guardrails:

* If a study somehow has **extremely many** instances (thousands+), you should:

  * at least code with efficiency in mind: one or two queries, not per-instance DB trips.
  * Optionally consider a **hard cap** (e.g. 10k instances) and return an error if broken – but this is optional for 14.5.

Use projections and grouping in EF where it still keeps the code readable. Don’t prematurely micro-optimize; just avoid obvious N+1 loops backed by separate DB calls per row.

---

## 5) No Frontend, But Future Contract is Clear

This endpoint is **designed for the later Cornerstone3D frontend** but we do NOT touch React now.

Later, the viewer will do something like:

* Call `GET /api/v1/radiology/pacs/studies/{id}/series-tree`
* Pick a series:

  * `const imageIds = series.instances.map(x => x.wadouri);`
* Pass `imageIds` into Cornerstone3D stack/volume loader.

So keep property names clean and stable:

* `seriesTree.series[x].instances[y].wadouri` is the key thing.

---

## 6) Acceptance Criteria for Day 14.5

Day 14.5 is DONE when:

1. A new DTO set exists:

   * `PacsSeriesTreeDto`, `PacsSeriesNodeDto`, `PacsInstanceNodeDto` (or similarly named), in the DTO/model project.
2. `IPacsService` has a new method:

   * `GetSeriesTreeAsync(Guid radiologyStudyId, Guid currentUserId, string apiBaseUrl)`
   * Implementation:

     * Validates study & user permissions.
     * Loads PACS data for the study.
     * Builds a fully populated `PacsSeriesTreeDto` with:

       * Correct UIDs and counts.
       * Instances sorted by `InstanceNumber`.
       * `Wadouri` strings pointing to the existing instance file endpoint.
3. New API endpoint:

   * `GET /api/v1/radiology/pacs/studies/{radiologyStudyId}/series-tree`
   * Uses current user + request to build `apiBaseUrl`.
   * Returns `200 OK` with `PacsSeriesTreeDto`.
   * Returns reasonable error codes for:

     * Study not found.
     * No permission.
4. RBAC enforced:

   * Radiologist/XRayTech/Admin can call this endpoint.
   * Reception/Delivery/other roles cannot.
5. No frontend or Cornerstone code added or modified.

---

**At the end of your answer**, give a short TLDR:

* What Day 14.5 implemented (1–2 lines)
* List of main files added/changed
* Any manual steps (e.g., none / just rebuild API)

---