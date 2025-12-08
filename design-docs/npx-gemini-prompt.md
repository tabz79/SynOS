## Day 14.4 — DICOM Metadata & PACS Index (Backend Only)

Use this as your Gemini backend prompt.

---

**Title:**
Day 14.4 — DICOM Metadata & PACS Index (Real DICOM Parsing, Backend Only)

**Context:**
You are a .NET 8 BACKEND expert working on **SynOS**, a Diagnostic Lab Management System.

Existing stack:

* ASP.NET Core .NET 8 Web API
* EF Core + SQL Server
* Clean-ish architecture (Data/Entities/Configs/Migrations, Services, Models/DTOs, Api)

Radiology module is implemented up to **Day 14.3**:

* RadiologyStudy, RadiologyReports, workflow, RBAC, etc.
* Mini PACS core from Day 14.3:

  * `PacsSeries` and `PacsInstances` tables already exist.
  * PACS file storage layout exists, e.g.:
    `Pacs:RootPath` → `{RootPath}/{OrgId}/{BranchId}/{RadiologyStudyId}/{SeriesId}/{InstanceId}.dcm`
  * Upload endpoint:
    `POST /api/v1/radiology/pacs/{radiologyStudyId}/upload`
    currently:

    * saves files to disk
    * creates PacsSeries/PacsInstances with **placeholder UIDs/metadata**
  * Download endpoint:
    `GET /api/v1/radiology/pacs/instances/{instanceId}/file`
    streams raw `.dcm`.

**Goal of Day 14.4:**

* Plug in a real **DICOM parser**.
* Fill proper `StudyInstanceUid`, `SeriesInstanceUid`, `SopInstanceUid`, `InstanceNumber`, etc.
* Create/update `PacsSeries` and `PacsInstances` using actual tags.
* Add a “reindex” endpoint to rebuild metadata for an existing study.
* Keep everything **backend-only**. No frontend/Cornerstone yet.

---

### 🔒 Guardrails / Constraints

* **Backend only.**
  Do NOT write any React/JS/front-end code.
* Do NOT run shell, build, or git commands.
  You may *suggest* commands in TLDR but not execute anything.
* Only modify:

  * Data / Entities / EF Config / Migrations
  * Services (PACS service, helpers)
  * Models/DTOs
  * Api controllers + DI
* Do NOT refactor unrelated modules.
  Keep changes scoped to **PACS + small radiology wiring**.

---

## 1) Add DICOM Parsing Library

Use a mature .NET DICOM library (for example **fo-dicom** / `FellowOakDicom`):

* Add a NuGet reference in the appropriate project(s) (most likely the Services or a dedicated PACS/DICOM project).
* Do **not** actually run the package command; just update the `.csproj` and mention the command in TLDR, e.g.:

```bash
dotnet add <YourServicesProject>.csproj package FellowOakDicom
```

---

## 2) Create DICOM Metadata Helper

Create a helper class (e.g. under a `Pacs` or `Dicom` folder):

```csharp
public sealed class DicomMetadata
{
    public string StudyInstanceUid { get; set; } = default!;
    public string SeriesInstanceUid { get; set; } = default!;
    public string SopInstanceUid { get; set; } = default!;
    public string? Modality { get; set; }
    public string? SeriesDescription { get; set; }
    public int? SeriesNumber { get; set; }
    public int? InstanceNumber { get; set; }
    public int? FrameCount { get; set; }
    // optional extra fields for future 3D work:
    public string? ImagePositionPatient { get; set; }   // e.g., "x\y\z"
    public string? ImageOrientationPatient { get; set; } // 6 values
    public string? PixelSpacing { get; set; }           // e.g., "dx\dy"
}
```

Create a static helper, e.g. `DicomMetadataExtractor`:

```csharp
public static class DicomMetadataExtractor
{
    public static async Task<DicomMetadata> ParseAsync(Stream fileStream)
    {
        // Use FellowOakDicom to read the dataset
        // Example pattern (adjust for sync/async as needed):

        // using var dicomFile = await DicomFile.OpenAsync(fileStream);
        // var dataset = dicomFile.Dataset;

        // Read tags safely with defaults:
        // var studyUid = dataset.GetSingleValueOrDefault(DicomTag.StudyInstanceUID, string.Empty);
        // var seriesUid = dataset.GetSingleValueOrDefault(DicomTag.SeriesInstanceUID, string.Empty);
        // var sopUid = dataset.GetSingleValueOrDefault(DicomTag.SOPInstanceUID, string.Empty);

        // Same for modality, description, numbers, etc.

        // If any of the core UIDs are missing, throw a domain-level "InvalidDicomFile" exception.

        // Return DicomMetadata populated with real values.
    }
}
```

**Requirements:**

* At minimum, you must correctly extract:

  * `StudyInstanceUid` (0020,000D) – required
  * `SeriesInstanceUid` (0020,000E) – required
  * `SopInstanceUid` (0008,0018) – required
  * `Modality` (0008,0060) – optional
  * `SeriesDescription` (0008,103E) – optional
  * `SeriesNumber` (0020,0011) – optional
  * `InstanceNumber` (0020,0013) – optional
  * `FrameCount` (0028,0008) – optional
* If any required UID is missing or empty, treat the file as invalid and surface a clean 400/422-style error from the API.

---

## 3) Update IPacsService.UploadDicomAsync to Use Real Metadata

You already have:

```csharp
Task<PacsUploadResultDto> UploadDicomAsync(
    Guid radiologyStudyId,
    IReadOnlyList<IFormFile> files,
    Guid currentUserId);
```

Update its implementation as follows:

### 3.1 Load RadiologyStudy + Security

* Load `RadiologyStudy` by `radiologyStudyId`.
* Validate:

  * Study exists.
  * User has permission (Radiologist/XRayTech/Admin).
  * `OrgId` and `BranchId` match user’s allowed scope.

Re-use your existing patterns for security and multi-branch checks.

### 3.2 Group by Study/Series UIDs

For each uploaded file:

1. Read the file into a stream (you can either:

   * copy to a temp stream first (for parsing) then save to final path, or
   * read once from `IFormFile.OpenReadStream()` for parsing, then reposition if needed).

2. Call `DicomMetadataExtractor.ParseAsync` to get `DicomMetadata`.

3. Use the **real** UIDs:

   * `StudyInstanceUid`
   * `SeriesInstanceUid`
   * `SopInstanceUid`

4. **Series handling:**

   * Check if a `PacsSeries` already exists for:

     * `RadiologyStudyId`
     * `StudyInstanceUid`
     * `SeriesInstanceUid`
   * If exists, reuse it.
   * If not, create a new `PacsSeries` with:

     * `RadiologyStudyId`, `OrgId`, `BranchId` from the study
     * `StudyInstanceUid` from metadata
     * `SeriesInstanceUid` from metadata
     * `Modality`, `Description`, `SeriesNumber` from metadata
     * `CreatedBy = currentUserId`

5. **Instance handling:**

   * Always create a `PacsInstance` row:

     * `SeriesId` = selected/created PacsSeries
     * `RadiologyStudyId` = study
     * `OrgId`, `BranchId` from study
     * `StudyInstanceUid`, `SeriesInstanceUid`, `SopInstanceUid` from metadata
     * `InstanceNumber`, `FrameCount` from metadata
     * `FilePath` = computed using `{RootPath}/{OrgId}/{BranchId}/{RadiologyStudyId}/{SeriesId}/{InstanceId}.dcm`
     * `FileSizeBytes` from actual saved file
     * `ContentType = "application/dicom"`
     * `CreatedBy = currentUserId`

6. Save the physical file to disk **after** metadata is parsed, using the same path scheme as Day 14.3 (or adjust slightly but consistently).

7. Return `PacsUploadResultDto` summarising:

   * `RadiologyStudyId`
   * `SeriesCreated` (count of new series)
   * `InstancesCreated` (number of instances saved)

Make sure old 14.3 “dummy UID” logic is removed/replaced. Everything from Day 14.4 onwards must rely on **real DICOM metadata**.

---

## 4) Add Reindex Endpoint for Existing Studies

Some studies may already have DICOM files stored with placeholder UIDs from Day 14.3.
We need a way to “fix” them by re-reading files from disk.

### 4.1 Service Method

Extend `IPacsService`:

```csharp
Task<PacsReindexResultDto> ReindexStudyAsync(
    Guid radiologyStudyId,
    Guid currentUserId);
```

`PacsReindexResultDto` can contain:

```csharp
public sealed class PacsReindexResultDto
{
    public Guid RadiologyStudyId { get; set; }
    public int SeriesUpdated { get; set; }
    public int InstancesUpdated { get; set; }
    public int InstancesFailed { get; set; }
}
```

**Implementation logic:**

1. Load `RadiologyStudy` + permission checks (same as upload).
2. Load all `PacsInstances` for that `RadiologyStudyId`.
3. For each instance:

   * If `FilePath` missing or file not found → increment `InstancesFailed` and continue.
   * Open the file and call `DicomMetadataExtractor.ParseAsync`.
   * Recompute or reuse corresponding `PacsSeries`:

     * Find or create series by `RadiologyStudyId + StudyInstanceUid + SeriesInstanceUid`.
   * Update `PacsInstance` fields:

     * `SeriesId`, `StudyInstanceUid`, `SeriesInstanceUid`, `SopInstanceUid`, `InstanceNumber`, `FrameCount`, etc.
4. Optionally keep track of how many distinct `PacsSeries` were created/updated.
5. Save changes and return `PacsReindexResultDto`.

Do **not** delete any files in Day 14.4. Only update DB metadata.

### 4.2 Controller Endpoint

In `PacsController` (or equivalent):

`POST api/v1/radiology/pacs/{radiologyStudyId:guid}/reindex`

* Auth:

  * `[Authorize(Roles = "Radiologist,Admin")]`
    (XRayTech can upload but reindex can be restricted to Radiologist/Admin if you want.)
* Action:

  * Get `currentUserId` from claims.
  * Call `ReindexStudyAsync(radiologyStudyId, currentUserId)`.
  * Return `200 OK` with `PacsReindexResultDto`.

---

## 5) Optional DB Tightening (If Safe)

If Day 14.3 initially allowed null or dummy values for UIDs, you may now:

* Update EF configurations so:

  * `StudyInstanceUid`, `SeriesInstanceUid`, `SopInstanceUid` are required (non-null).
* Add or refine indexes where helpful:

  * `(RadiologyStudyId, StudyInstanceUid, SeriesInstanceUid)` on `PacsSeries`.
  * `(SeriesId, SopInstanceUid)` or `(StudyInstanceUid, SeriesInstanceUid, SopInstanceUid)` on `PacsInstances`.

**Important:**
Keep migrations backward-compatible and non-destructive. If there is a risk that existing rows have nulls, handle that in migration (e.g., set temporary values or require reindex before enforcing non-null).

---

## 6) Logging & Error Handling

* If parsing fails (invalid DICOM file):

  * Log a warning with StudyId + file name.
  * For upload:

    * Either reject that single file and continue with others, or fail the entire batch with a clear message. Choose and document the behavior.
  * For reindex:

    * Increment `InstancesFailed` and continue with others.

* Map domain exceptions to clean HTTP responses:

  * Missing Study or no permission → 404/403.
  * Invalid DICOM → 400/422 with a short explanation.

Use whatever exception → response pattern you already use.

---

## 7) Acceptance Criteria for Day 14.4

Day 14.4 is DONE when:

1. A DICOM parsing library is referenced and a `DicomMetadataExtractor` (or equivalent) reads real DICOM tags:

   * StudyInstanceUid, SeriesInstanceUid, SopInstanceUid (required)
   * Modality, SeriesDescription, SeriesNumber, InstanceNumber, FrameCount (optional)
2. `UploadDicomAsync`:

   * Uses real DICOM metadata to:

     * Reuse or create `PacsSeries` by Study/Series UIDs.
     * Create `PacsInstance` with correct UIDs and instance numbers.
   * Still saves files using the configured PACS root path.
3. Existing upload endpoint:

   * `POST /api/v1/radiology/pacs/{radiologyStudyId}/upload`
   * Now produces **real** metadata in DB for new uploads.
4. New reindex endpoint:

   * `POST /api/v1/radiology/pacs/{radiologyStudyId}/reindex`
   * Re-reads existing instance files and corrects metadata in DB.
   * Returns a summary DTO with counts.
5. RBAC is enforced for both upload and reindex.
6. No frontend/Cornerstone code has been added or changed.

---

**At the end of your answer**, give a short TLDR for me:

* What you implemented in Day 14.4 (1–2 lines).
* List of main files added/modified.
* Any manual steps (e.g., run migration, install NuGet).

---
