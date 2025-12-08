e’ll bolt Mini PACS onto your existing **Radiology (14.x)** like this:

* **Day 14.3** – Mini PACS Core Storage
  DB tables + disk layout + upload + stream file API. No DICOM parsing yet.
* **Day 14.4** – DICOM Metadata & Index
  Parse UIDs, modality, instance numbers, etc. Fill real values into PACS tables.
* **Day 14.5** – Series Tree + WADO-style API
  One JSON endpoint that returns Cornerstone-ready `wadouri:` URLs per study.
* **Day 14.6** – Cross-Branch & Hardening
  Enforce org/branch, RBAC, cleanup tools, basic retention rules.

You can stop after **14.5** and you’ll already have a proper mini PACS backend.

Now I’ll give you a **ready-to-paste prompt for Day 14.3** in the same style as your earlier backend days.

---

## 📜 Day 14.3 – Mini PACS Core Storage (Backend Only)

Use this as your Gemini backend prompt:

---

**Title:**
Day 14.3 — Mini PACS Core Storage (Backend Only, No DICOM Parsing)

**Context:**
You are a .NET 8 BACKEND expert working on **SynOS**, a Diagnostic Lab Management System.

Existing backend stack (same as earlier radiology days):

* ASP.NET Core .NET 8 Web API
* EF Core + SQL Server
* Clean-ish architecture with layers like:

  * Data / Entities / Configs / Migrations
  * Services (Domain/Business)
  * Models/DTOs
  * Api (Controllers, DI, Middleware)

Radiology module is already implemented up to **Day 14.2**:

* RadiologyStudy (linked to Patient/Visit/Org/Branch)
* RadiologyReports, status transitions, assigning to radiologists, signing etc.
* Roles: Radiologist, XRayTech, Admin, Reception, etc.

Now we want to extend Radiology with a **Mini PACS** backend.

**Goal of Day 14.3:**

* Add core PACS tables (Series + Instances) linked to RadiologyStudy.
* Define server-side file storage for DICOM files (local disk on central SynOS server).
* Implement upload + download endpoints (no real DICOM parsing yet).
* Make sure everything is **Org + Branch aware** from day one.
* NO frontend code, NO Cornerstone integration yet.

---

### 🔒 Guardrails / Constraints (follow exactly)

* **Backend only.**
  Do NOT write any React/JS/frontend code. Only Web API / EF / services.
* Do NOT run shell commands or touch git.
  Just generate code + mention migrations/commands in a TLDR summary.
* Only modify backend projects:

  * Data / Entities / Configurations / Migrations
  * Services (IPacsService + implementation)
  * Models/DTOs (PACS DTOs)
  * Api controllers + DI registration
* Do NOT refactor unrelated code.
  Keep changes scoped to **PACS** and minimal wiring into Radiology.

---

## 1) Database: PACS Tables

We are adding a minimal **Mini PACS** model that plugs into existing RadiologyStudy.

Create two new tables via EF Core:

### PacsSeries

* `SeriesId` (GUID, PK)
* `RadiologyStudyId` (GUID, not null, FK → RadiologyStudies)
* `OrgId` (GUID, not null)
* `BranchId` (GUID, not null)
* `StudyInstanceUid` (string, max 200, not null)  // DICOM tag 0020,000D (for later)
* `SeriesInstanceUid` (string, max 200, not null) // DICOM tag 0020,000E
* `Modality` (string, max 50, nullable)           // “CT”, “MR”, etc.
* `Description` (string, nvarchar 200, nullable)  // SeriesDescription
* `SeriesNumber` (int?, nullable)                 // DICOM 0020,0011
* `CreatedAt` (DateTimeOffset, default UTC now)
* `CreatedBy` (GUID, not null, FK to Users or similar)

Add indexes:

* By `RadiologyStudyId`
* By `StudyInstanceUid`
* By `SeriesInstanceUid`

For Day 14.3, `StudyInstanceUid` and `SeriesInstanceUid` can be dummy placeholders, but columns must exist now. In Day 14.4 we’ll fill them from real DICOM tags.

### PacsInstance

* `InstanceId` (GUID, PK)
* `SeriesId` (GUID, not null, FK → PacsSeries)
* `RadiologyStudyId` (GUID, not null, FK → RadiologyStudies)
* `OrgId` (GUID, not null)
* `BranchId` (GUID, not null)
* `StudyInstanceUid` (string, max 200, not null)
* `SeriesInstanceUid` (string, max 200, not null)
* `SopInstanceUid` (string, max 200, not null)   // DICOM 0008,0018
* `InstanceNumber` (int?, nullable)               // DICOM 0020,0013
* `FrameCount` (int?, nullable)                   // for multi-frame images
* `FilePath` (nvarchar 500, not null)             // absolute path on server
* `FileSizeBytes` (bigint?, nullable)
* `ContentType` (string, max 100, not null, default “application/dicom”)
* `CreatedAt` (DateTimeOffset, default UTC now)
* `CreatedBy` (GUID, not null)

Indexes:

* By `SeriesId`
* By `RadiologyStudyId`
* By `SopInstanceUid`

**Important:**

* Get `OrgId` and `BranchId` from the linked `RadiologyStudy` (or whatever entity currently has them) when creating PACS rows.
* For Day 14.3, you are allowed to use **dummy UIDs** (`Guid.NewGuid().ToString()` or similar) and null instance numbers, because we will do real DICOM parsing on Day 14.4.

---

## 2) Storage Layout on Disk

We are using **local disk** on the central SynOS server (no S3 yet).

Add a config section to `appsettings`:

```json
"Pacs": {
  "RootPath": "/data/pacs" // example for Linux; on Windows this can be "D:\\SynOS\\Pacs"
}
```

Define the folder structure for DICOM files:

```text
{RootPath}/{OrgId}/{BranchId}/{RadiologyStudyId}/{SeriesId}/{InstanceId}.dcm
```

Rules:

* When saving a file:

  * Create directories if they don’t exist.
  * Use `InstanceId` as the filename (with `.dcm`).
  * Save **absolute full path** into `PacsInstance.FilePath`.
* Do NOT store anything on client PCs. This is all **server-side**.

---

## 3) Service Layer – IPacsService

Create a dedicated service interface and implementation:

```csharp
public interface IPacsService
{
    Task<PacsUploadResultDto> UploadDicomAsync(
        Guid radiologyStudyId,
        IReadOnlyList<IFormFile> files,
        Guid currentUserId
    );

    Task<(Stream Stream, string ContentType)> GetDicomStreamAsync(
        Guid instanceId,
        Guid currentUserId
    );
}
```

### UploadDicomAsync behavior:

1. Load `RadiologyStudy` by `radiologyStudyId`:

   * If not found → throw domain exception → mapped to 404.
   * Validate `OrgId` + `BranchId` and that `currentUserId` has permission (Radiologist/XRayTech/Admin) to upload for this study.

2. For now, keep series grouping simple (we’ll refine later when proper tags arrive):

   * Option A (acceptable for 14.3):

     * Create **one PacsSeries** per upload call:

       * `StudyInstanceUid` and `SeriesInstanceUid` = new GUID strings for now.
       * `Modality` / `Description` / `SeriesNumber` = null or simple defaults.
   * Option B (if you want a bit more structure):

     * One PacsSeries per **upload batch** or per modality type – but keep the logic simple and easy to replace in Day 14.4.

3. For each `IFormFile`:

   * Generate new `InstanceId`.
   * Build full `FilePath` using the folder structure.
   * Save file stream to disk.
   * Insert `PacsInstance` row:

     * `RadiologyStudyId`, `OrgId`, `BranchId` from RadiologyStudy.
     * `SeriesId` pointing to the PacsSeries just created.
     * `StudyInstanceUid`, `SeriesInstanceUid`: same as series row.
     * `SopInstanceUid`: new GUID string (placeholder for now).
     * `InstanceNumber`, `FrameCount`: null for now.
     * `FilePath` + `FileSizeBytes` from saved file.
     * `CreatedBy = currentUserId`.

4. Optionally (but nice for flow):

   * If RadiologyStudy is in a “PendingImaging” status, you can move it to a more appropriate status like “ImagingCompleted” or “ImagesAttached”. Keep this small and consistent with existing status enums.

5. Return a `PacsUploadResultDto`:

```csharp
public sealed class PacsUploadResultDto
{
    public Guid RadiologyStudyId { get; set; }
    public Guid SeriesId { get; set; }
    public int InstancesCreated { get; set; }
}
```

### GetDicomStreamAsync behavior:

1. Load `PacsInstance` by `InstanceId`.
2. Validate permissions:

   * `currentUserId` must belong to same Org, and role must be Radiologist, XRayTech, or Admin.
3. Check if `FilePath` exists on disk:

   * If missing → throw domain exception → mapped to 404 “Instance file not found”.
4. Open file as read-only `FileStream`.
5. Return `(Stream, ContentType)` where ContentType is `instance.ContentType` (default `application/dicom`).

---

## 4) API Layer – PacsController

Create a new controller under something like `Controllers/Radiology/PacsController.cs`.

Base route: `api/v1/radiology/pacs`

### Endpoint 1 – Upload DICOM for a study

`POST api/v1/radiology/pacs/{radiologyStudyId:guid}/upload`

* Auth:

  * `[Authorize(Roles = "Radiologist,XRayTech,Admin")]` (use your existing naming convention).
* Request:

  * `multipart/form-data` with `files` as one or more `.dcm` files.
* Controller action:

  * Get `currentUserId` from claims (same style as other APIs).
  * Validate `files` not empty.
  * Call `IPacsService.UploadDicomAsync(radiologyStudyId, files, currentUserId)`.
  * Return `201 Created` with `PacsUploadResultDto`.

### Endpoint 2 – Download/stream DICOM instance

`GET api/v1/radiology/pacs/instances/{instanceId:guid}/file`

* Auth:

  * `[Authorize(Roles = "Radiologist,XRayTech,Admin")]`
* Controller action:

  * Get `currentUserId` from claims.
  * Call `IPacsService.GetDicomStreamAsync(instanceId, currentUserId)`.
  * Return `File(stream, contentType)`.

This URL will later be wrapped on the frontend as:

```text
wadouri:https://<api-base>/api/v1/radiology/pacs/instances/{instanceId}/file
```

but we do NOT implement any frontend in Day 14.3.

---

## 5) DTOs / Models

Under whatever project/namespacing you use for DTOs (e.g., `SynOS.Models.Pacs`):

* `PacsUploadResultDto` (as defined above).
* If you need, add simple request/response models for the upload route, but you can also just rely on `IFormFile` and route parameters.

Keep DTOs small and clean. No nested multi-level graphs yet.

---

## 6) Wiring & DI

* Register `IPacsService` + implementation in your DI container (Program/Startup or separate extension, following your existing style).
* Ensure `IOptions<PacsSettings>` or similar is bound to `Pacs:RootPath` from config.

At the end, Gemini should also:

* Generate EF entity classes for `PacsSeries` and `PacsInstance`.
* Add EF configurations (if you use Fluent API config classes).
* Add a migration for the new tables.
* Show sample migration name and CLI command in TLDR (but not execute it).

---

## 7) Acceptance Criteria for Day 14.3

Day 14.3 is **DONE** when:

1. New tables `PacsSeries` and `PacsInstances` exist in the DbContext and migrations.
2. `Pacs:RootPath` config exists and is used for file storage.
3. `POST /api/v1/radiology/pacs/{radiologyStudyId}/upload`:

   * Saves uploaded `.dcm` files to the correct folder structure.
   * Creates a PacsSeries + PacsInstances rows.
   * Returns a summary (seriesId + count of instances).
4. `GET /api/v1/radiology/pacs/instances/{instanceId}/file`:

   * Streams the file for valid users and returns 404 for missing/invalid ones.
5. RBAC is enforced:

   * Radiologist/XRayTech/Admin can access.
   * Reception and other non-imaging roles are blocked.
6. No frontend code has been touched or added.

At the **end** of Gemini’s answer, ask it to give a **short TLDR** like:

* What was implemented (1–2 lines)
* Which files were added/changed (list only)
* Any manual steps (run migration, update appsettings)

---

If you’re okay with this, your next move is simple:

1. Copy-paste the **Day 14.3 prompt** into Gemini (backend).
2. Let it generate changes.
3. Come back to me with:

   * Any compiler errors
   * Or the generated code if something feels off.

After 14.3 is stable, I’ll give you the **Day 14.4 (DICOM metadata + index)** prompt in the same format.