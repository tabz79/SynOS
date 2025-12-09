## Day 14.7 — Lab Analyzer Integration Foundation (Backend Only)

Use this as your Gemini backend prompt.

---

**Title:**
Day 14.7 — Lab Analyzer Integration Foundation (Backend Only)

**Context:**
You are a .NET 8 BACKEND expert working on **SynOS**, a Diagnostic Lab Management System.

**Stack:**

* ASP.NET Core .NET 8 Web API
* EF Core + SQL Server
* Layered / clean-ish architecture:

  * Data / Entities / EF Config / Migrations
  * Services / Domain logic
  * DTOs / Models
  * Api / Controllers / DI

**Current SynOS status (relevant parts):**

* Core entities & flows exist:

  * Patients, Visits, Orders, Invoices
  * Test Master with `testCode` (e.g. `CBC`, `HGB`, `FBS`, etc.)
  * Reception module (`start-visit`, `complete-payment`)
* Radiology:

  * RadiologyStudy, RadiologyReports, Mini PACS, DICOM backend are all implemented and stable.
* Pathology / Lab:

  * SynOS can **create lab orders** (e.g. Biochemistry, Hematology, etc.) as part of a visit.
  * Results are currently assumed to be **typed manually** into result entry screens (no machine integration yet).
* Multi-branch / Org:

  * Org/Branch concepts exist at least at Visit / Radiology level.
  * RBAC/roles exist: `Admin`, `Pathologist`, `LabTech`, etc. (adjust names to what’s actually there).

---

## Goal of Day 14.7

Lay the **foundation** for Analyzer / Lab Machine integration:

* Introduce **backend models + tables** to represent analyzers and incoming results.
* Provide basic **Analyzer Registration** APIs (Admin-only).
* Provide a **manual result ingestion endpoint** that mimics what a machine will send.
* Store incoming results in a **Lab Result Inbox / Queue** for later matching & review (future days).

No real serial/TCP/ASTM/HL7 integration yet — this day is about **data structures, services, and HTTP-based ingestion** that future days will build on.

Backend-only. No frontend.

---

## 🔒 Guardrails / Constraints

* **Backend only.**
  No React, no JS, no UI.
* Do NOT run shell, EF CLI, or git commands (you can mention them in a TLDR for the human to run).
* Only touch:

  * Lab / Pathology / Analyzer-related entities, configs, migrations
  * Lab/Analyzer services (new interfaces and implementations)
  * DTOs/Models for Analyzer + Result Inbox
  * Lab/Analyzer controllers & DI registration
* Do NOT change PACS / Radiology code in this day.
* Do NOT design full HL7/ASTM protocol parsing yet. Only prepare **internal models** where parsed data will land.

---

## 1) Data Model & EF Entities — Analyzer + Result Inbox

We need a small set of core entities:

### 1.1 `LabAnalyzer` entity

Add a new entity (e.g. `LabAnalyzer`) under your Models/Entities project.

Suggested fields (adapt naming to your conventions):

```csharp
public class LabAnalyzer
{
    public Guid AnalyzerId { get; set; }

    public Guid OrgId { get; set; }           // For future multi-branch scoping
    public Guid BranchId { get; set; }        // Can be Guid.Empty for now if not fully wired

    public string Name { get; set; }          // e.g. "Sysmex XN-1000"
    public string Model { get; set; }         // e.g. "XN-1000"
    public string Manufacturer { get; set; }  // e.g. "Sysmex"

    // ConnectionType describes how this analyzer will integrate in the future
    public string ConnectionType { get; set; } // e.g. "Manual", "ASTM", "HL7", "FileDrop"

    public bool IsEnabled { get; set; }

    public string? Notes { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
}
```

You may introduce an enum (or string constants) for `ConnectionType` if that matches your style better.

### 1.2 `LabAnalyzerResultInbox` entity

This is the **Result Queue**: every incoming reading (manual or machine) lands here first.

```csharp
public class LabAnalyzerResultInbox
{
    public Guid InboxId { get; set; }

    public Guid AnalyzerId { get; set; }
    public LabAnalyzer Analyzer { get; set; }

    // raw line / payload from the machine (or from the manual API)
    public string RawMessage { get; set; }

    // Parsed basic fields (can be null when first ingested)
    public string? PatientIdentifier { get; set; }   // MRN, SampleId, or Barcode value as received
    public string? AnalyzerTestCode { get; set; }    // test code as reported by machine, e.g. "HGB"
    public string? ResultValue { get; set; }         // keep as string for flexibility (numeric or qualitative)
    public string? Units { get; set; }               // e.g. "g/dL"
    public string? Flags { get; set; }               // e.g. "H", "L", "Critical", or machine-specific flags

    public DateTimeOffset? MeasuredAt { get; set; }  // When machine measured

    // Matching to SynOS structures (future days will fill these)
    public Guid? VisitId { get; set; }               // Matched visit
    public Guid? OrderId { get; set; }               // Matched lab order
    public string? SynosTestCode { get; set; }       // Mapped to SynOS testCode

    // Status and review
    public string Status { get; set; }               // e.g. "Pending", "Matched", "Rejected", "Imported"

    public DateTimeOffset ReceivedAt { get; set; }
    public Guid? ReceivedBy { get; set; }            // null if from real machine; userId if manual

    public DateTimeOffset? ReviewedAt { get; set; }
    public Guid? ReviewedBy { get; set; }
    public string? ReviewNote { get; set; }
}
```

**Important for Day 14.7:**
You **do not** need to implement matching logic yet — just the fields to support it in later days.

### 1.3 EF Config & Migration

* Add DbSet properties to your `SynOSDbContext`:

```csharp
public DbSet<LabAnalyzer> LabAnalyzers { get; set; }
public DbSet<LabAnalyzerResultInbox> LabAnalyzerResultInbox { get; set; }
```

* Configure relationships and indexes via EF configuration classes or `OnModelCreating`:

  * `LabAnalyzerResultInbox.AnalyzerId` → `LabAnalyzer`
  * Suggested indexes:

    * `AnalyzerId`
    * `Status`
    * `PatientIdentifier`
    * `VisitId`
    * `OrderId`

* Create and apply an EF migration (to be run by the human dev).

---

## 2) Configuration & Supporting Types

### 2.1 Connection Type Enum / Constants

Add something like:

```csharp
public static class LabAnalyzerConnectionTypes
{
    public const string Manual = "Manual";
    public const string Astm = "ASTM";
    public const string Hl7 = "HL7";
    public const string FileDrop = "FileDrop";
}
```

or use an enum if that’s standard in this codebase.

### 2.2 Optional: `LabAnalyzerSettings`

If appropriate, add a simple config class for global analyzer settings, e.g.:

```csharp
public class LabAnalyzerSettings
{
    public int MaxInboxItemsPerQuery { get; set; } = 500;
}
```

Bind it from `appsettings.json` (e.g. `"LabAnalyzer": { "MaxInboxItemsPerQuery": 500 }`) and register with `IOptions<LabAnalyzerSettings>`.

---

## 3) Service Layer — Analyzer & Inbox Services

Create a dedicated service interface and implementation for analyzers.

### 3.1 `ILabAnalyzerService`

In `SynOS.Services` (or equivalent):

```csharp
public interface ILabAnalyzerService
{
    Task<LabAnalyzer> CreateAnalyzerAsync(CreateLabAnalyzerDto dto, Guid currentUserId);
    Task<LabAnalyzer> UpdateAnalyzerAsync(Guid analyzerId, UpdateLabAnalyzerDto dto, Guid currentUserId);
    Task<LabAnalyzer?> GetAnalyzerAsync(Guid analyzerId, Guid currentUserId);
    Task<IReadOnlyList<LabAnalyzer>> GetAnalyzersAsync(Guid currentUserId);

    Task<LabAnalyzerResultInbox> EnqueueManualResultAsync(Guid analyzerId, ManualAnalyzerResultDto dto, Guid currentUserId);
}
```

### 3.2 DTOs

Create DTOs in `SynOS.Models/DTOs/LabAnalyzers` (adjust path to your conventions):

```csharp
public class CreateLabAnalyzerDto
{
    public string Name { get; set; }
    public string Model { get; set; }
    public string Manufacturer { get; set; }
    public string ConnectionType { get; set; } // Manual / ASTM / HL7 / FileDrop
    public string? Notes { get; set; }

    public Guid OrgId { get; set; }    // For now can be Guid.Empty if needed
    public Guid BranchId { get; set; } // same
}

public class UpdateLabAnalyzerDto
{
    public string Name { get; set; }
    public string Model { get; set; }
    public string Manufacturer { get; set; }
    public string ConnectionType { get; set; }
    public string? Notes { get; set; }
    public bool IsEnabled { get; set; }
}

public class LabAnalyzerSummaryDto
{
    public Guid AnalyzerId { get; set; }
    public string Name { get; set; }
    public string Model { get; set; }
    public string Manufacturer { get; set; }
    public string ConnectionType { get; set; }
    public bool IsEnabled { get; set; }
}

public class ManualAnalyzerResultDto
{
    public string RawMessage { get; set; }              // Entire "line" as if from device

    public string? PatientIdentifier { get; set; }      // MRN / Sample ID / Barcode string
    public string? AnalyzerTestCode { get; set; }       // Machine test code
    public string? ResultValue { get; set; }            // "12.3" or "Positive"
    public string? Units { get; set; }                  // e.g. "g/dL"
    public string? Flags { get; set; }                  // e.g. "H", "L", "Critical"
    public DateTimeOffset? MeasuredAt { get; set; }     // Time of measurement (optional)
}
```

### 3.3 Service Implementation

Implement `LabAnalyzerService`:

* `CreateAnalyzerAsync`:

  * Validate `Name`, `ConnectionType`.
  * Set OrgId/BranchId (for now may accept from DTO or derive from current user).
  * Set `IsEnabled = true`, `CreatedAt`, `CreatedBy`.
* `UpdateAnalyzerAsync`:

  * Allow renaming and toggling `IsEnabled`.
* `GetAnalyzer*` / `GetAnalyzers*`:

  * Filter by Org if necessary, or leave simple for now.
* `EnqueueManualResultAsync`:

  * Validate the analyzer exists and `IsEnabled`.
  * Populate a new `LabAnalyzerResultInbox` item:

    * `AnalyzerId = analyzerId`.
    * `RawMessage = dto.RawMessage ?? construct a simple JSON or joined string from dto fields`.
    * Copy `PatientIdentifier`, `AnalyzerTestCode`, `ResultValue`, `Units`, `Flags`, `MeasuredAt`.
    * Set `Status = "Pending"` (or `"PendingMatch"`).
    * Set `ReceivedAt = DateTimeOffset.UtcNow`, `ReceivedBy = currentUserId`.
  * Save to DB and return the created entity.

No matching logic to Visit/Order/Test yet — that will be in **Day 14.8+**.

---

## 4) API Controllers — Analyzer Admin + Manual Result Ingestion

Create new controllers under `SynOS.Api/Controllers/Lab` (or equivalent):

### 4.1 `LabAnalyzersController`

Route base:
`/api/v1/lab/analyzers`

Endpoints (all `[Authorize(Roles = "Admin")]` or similar):

1. `POST /api/v1/lab/analyzers`

   * Input: `CreateLabAnalyzerDto`
   * Output: `LabAnalyzerSummaryDto`
   * Behavior: calls `CreateAnalyzerAsync`.

2. `PUT /api/v1/lab/analyzers/{analyzerId}`

   * Input: `UpdateLabAnalyzerDto`
   * Output: `LabAnalyzerSummaryDto`
   * Behavior: calls `UpdateAnalyzerAsync`.

3. `GET /api/v1/lab/analyzers`

   * Output: `List<LabAnalyzerSummaryDto>`
   * Behavior: calls `GetAnalyzersAsync`.

4. `GET /api/v1/lab/analyzers/{analyzerId}`

   * Output: `LabAnalyzerSummaryDto` (or 404 if missing).

You can follow your existing API response wrapper pattern (`{ data: ... }`) if that’s standard in SynOS.

### 4.2 `LabAnalyzerResultsController` (Manual Ingestion)

Route base:
`/api/v1/lab/analyzers/{analyzerId}/results`

Endpoints:

1. `POST /api/v1/lab/analyzers/{analyzerId}/results/manual`

   * Authorization: `[Authorize(Roles = "Admin,LabTech,Pathologist")]` (adjust to your RBAC)
   * Input: `ManualAnalyzerResultDto`
   * Behavior:

     * Get `currentUserId` from claims.
     * Calls `EnqueueManualResultAsync(analyzerId, dto, currentUserId)`.
   * Output:

     * A simple DTO summarizing what was stored, e.g.:

```json
{
  "inboxId": "guid",
  "analyzerId": "guid",
  "status": "Pending",
  "patientIdentifier": "A00015",
  "analyzerTestCode": "HGB",
  "resultValue": "12.3",
  "units": "g/dL"
}
```

No listing / review endpoints are required for Day 14.7 (that’s for 14.10), but if you want a minimal debug endpoint:

2. `GET /api/v1/lab/analyzers/{analyzerId}/results/inbox`

   * Optional, but useful for testing.
   * Returns last N inbox items for that analyzer (`TOP 50` or configurable).
   * If you add this, make it Admin/Pathologist-only.

---

## 5) Logging & Safety

* Log at INFO level:

  * Analyzer created / updated
  * Manual result enqueued (`AnalyzerId`, `PatientIdentifier`, `AnalyzerTestCode`, `ResultValue`)
* Handle common errors gracefully:

  * `404` if analyzer does not exist.
  * `400` for invalid payload (missing required fields).
* Ensure **Org/Branch** will be easy to enforce later:

  * At minimum, store `OrgId`/`BranchId` on `LabAnalyzer`.
  * You don’t need to write a full guard like PACS’ `IRadiologyAccessGuard` yet, but don’t block future extension.

---

## 6) Acceptance Criteria for Day 14.7

Day 14.7 is DONE when:

1. **Entities & DB:**

   * `LabAnalyzer` and `LabAnalyzerResultInbox` entities exist.
   * DbContext is updated with DbSets.
   * Migration created and (manually) applied.

2. **Services:**

   * `ILabAnalyzerService` (or equivalent) is created and registered in DI.
   * `CreateAnalyzerAsync`, `UpdateAnalyzerAsync`, `GetAnalyzer(s)Async`, `EnqueueManualResultAsync` are implemented.

3. **APIs:**

   * `POST /api/v1/lab/analyzers` creates an analyzer.
   * `GET /api/v1/lab/analyzers` lists analyzers.
   * `POST /api/v1/lab/analyzers/{analyzerId}/results/manual`:

     * Accepts a payload with `PatientIdentifier`, `AnalyzerTestCode`, `ResultValue`, etc.
     * Persists a row in `LabAnalyzerResultInbox` with `Status = "Pending"` and correct `ReceivedAt`, `ReceivedBy`.

4. **Manual Test via Swagger:**

   * Create a dummy analyzer (e.g. “Demo CBC Analyzer”).
   * Use its `analyzerId` to call the manual results endpoint with:

     * `PatientIdentifier = "A00015"`
     * `AnalyzerTestCode = "HGB"`
     * `ResultValue = "12.3"`
     * `Units = "g/dL"`
   * Verify in DB that:

     * A `LabAnalyzerResultInbox` row was created.
     * Fields are correctly populated.

5. No analyzer matching/mapping, no HL7/ASTM parsing, no result review UI is implemented in this day. That’s for Day 14.8+.

---

## At the end of your answer, provide a short TLDR:

* 1–2 lines: what Day 14.7 implemented.
* Main files added/changed.
* Any manual steps (e.g. `dotnet ef migrations add AddLabAnalyzerTables` + `dotnet ef database update`, `appsettings` updates, DI registration, etc.).
